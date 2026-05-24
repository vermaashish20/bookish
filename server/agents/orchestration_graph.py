"""
New Agent Orchestration Graph
Based on Agent_Orchest.md specification
"""
from langgraph.graph import StateGraph, END
from agents.orchestration_state import AgentOrchestrationState
from agents.orchestrator import handle_general_chat
from agents.nodes.planner_node import planner_node
from agents.nodes.researcher_node import researcher_node
from agents.nodes.writer_node import writer_node
from agents.nodes.fact_checker_node import fact_checker_node
from agents.nodes.humanizer_node import humanizer_node
from agents.nodes.editor_node import editor_node
from repository.chat_messages import add_chat_message
from repository.agent_runs import complete_agent_run
from datetime import datetime


def route_entry(state: AgentOrchestrationState) -> str:
    """
    Route based on orchestrator classification
    - general_chat: Answer directly
    - agent_task: Send to planner
    """
    return state["route"]


def should_continue_tasks(state: AgentOrchestrationState) -> str:
    """
    Check if there are more tasks to execute
    """
    if state["currentTaskIndex"] >= len(state["tasks"]):
        return "finalize"
    
    # Get next task
    next_task = state["tasks"][state["currentTaskIndex"]]
    agent_name = next_task["agent"]
    
    # Route to appropriate agent
    if agent_name == "researcher":
        return "researcher"
    elif agent_name == "writer":
        return "writer"
    elif agent_name == "fact_checker":
        return "fact_checker"
    elif agent_name == "humanizer":
        return "humanizer"
    elif agent_name == "editor":
        return "editor"
    else:
        # Unknown agent, skip to finalize
        return "finalize"


def finalize_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Finalize the orchestration
    - Create final response
    - Save assistant message
    - Update agent run status
    """
    thinking = "[Orchestrator] Finalizing execution...\n"
    
    # Build final response
    if state["route"] == "general_chat":
        # Already handled in handle_general_chat
        final_response = state["finalResponse"]
    else:
        # Agent task - build response from planner and agent outputs
        planner_output = state.get("plannerOutput")
        
        if planner_output:
            final_response = f"{planner_output['userVisibleSummary']}\n\n"
        else:
            final_response = "Task completed.\n\n"
        
        # Add agent outputs
        if state.get("researchNotes"):
            final_response += "**Research completed.**\n\n"
        
        if state.get("draftContent"):
            final_response += "**Draft created:**\n\n"
            final_response += state["draftContent"][:500]  # Preview
            if len(state["draftContent"]) > 500:
                final_response += "\n\n...(content truncated, see full draft in artifacts)"
        
        if state.get("editedContent"):
            final_response += "\n\n**Edited version:**\n\n"
            final_response += state["editedContent"][:500]
            if len(state["editedContent"]) > 500:
                final_response += "\n\n...(content truncated)"
        
        if state.get("humanizedContent"):
            final_response += "\n\n**Humanized version:**\n\n"
            final_response += state["humanizedContent"][:500]
            if len(state["humanizedContent"]) > 500:
                final_response += "\n\n...(content truncated)"
        
        if state.get("factCheckReport"):
            final_response += "\n\n**Fact Check Report:**\n\n"
            final_response += state["factCheckReport"][:300]
    
    # Save assistant message
    final_message_id = add_chat_message(
        project_id=state["projectId"],
        role="assistant",
        content=final_response,
        agent_run_id=state["agentRunId"],
        artifact_references=state["artifactIds"]
    )
    
    # Update agent run
    complete_agent_run(
        run_id=state["agentRunId"],
        final_message_id=final_message_id,
        status="completed"
    )
    
    thinking += f"[Orchestrator] Execution completed. Message saved: {final_message_id}\n"
    
    # Update state
    state["finalResponse"] = final_response
    state["finalMessageId"] = final_message_id
    state["status"] = "completed"
    state["completedAt"] = datetime.utcnow().isoformat()
    state["thinking_logs"].append(thinking)
    
    return state


def build_orchestration_graph():
    """
    Build the new orchestration graph
    
    Flow:
    1. Entry point routes to general_chat or planner
    2. General chat answers directly and ends
    3. Planner creates execution plan
    4. Tasks execute in sequence (researcher -> writer -> etc.)
    5. Finalize creates response and saves to DB
    """
    workflow = StateGraph(AgentOrchestrationState)
    
    # Add nodes
    workflow.add_node("general_chat", handle_general_chat)
    workflow.add_node("planner", planner_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("fact_checker", fact_checker_node)
    workflow.add_node("humanizer", humanizer_node)
    workflow.add_node("editor", editor_node)
    workflow.add_node("finalize", finalize_node)
    
    # Set conditional entry point
    workflow.set_conditional_entry_point(
        route_entry,
        {
            "general_chat": "general_chat",
            "agent_task": "planner"
        }
    )
    
    # General chat goes directly to finalize
    workflow.add_edge("general_chat", "finalize")
    
    # Planner goes to task router
    workflow.add_conditional_edges(
        "planner",
        should_continue_tasks,
        {
            "researcher": "researcher",
            "writer": "writer",
            "fact_checker": "fact_checker",
            "humanizer": "humanizer",
            "editor": "editor",
            "finalize": "finalize"
        }
    )
    
    # Each agent goes back to task router
    workflow.add_conditional_edges(
        "researcher",
        should_continue_tasks,
        {
            "researcher": "researcher",
            "writer": "writer",
            "fact_checker": "fact_checker",
            "humanizer": "humanizer",
            "editor": "editor",
            "finalize": "finalize"
        }
    )
    
    workflow.add_conditional_edges(
        "writer",
        should_continue_tasks,
        {
            "researcher": "researcher",
            "writer": "writer",
            "fact_checker": "fact_checker",
            "humanizer": "humanizer",
            "editor": "editor",
            "finalize": "finalize"
        }
    )
    
    workflow.add_conditional_edges(
        "fact_checker",
        should_continue_tasks,
        {
            "researcher": "researcher",
            "writer": "writer",
            "fact_checker": "fact_checker",
            "humanizer": "humanizer",
            "editor": "editor",
            "finalize": "finalize"
        }
    )
    
    workflow.add_conditional_edges(
        "humanizer",
        should_continue_tasks,
        {
            "researcher": "researcher",
            "writer": "writer",
            "fact_checker": "fact_checker",
            "humanizer": "humanizer",
            "editor": "editor",
            "finalize": "finalize"
        }
    )
    
    workflow.add_conditional_edges(
        "editor",
        should_continue_tasks,
        {
            "researcher": "researcher",
            "writer": "writer",
            "fact_checker": "fact_checker",
            "humanizer": "humanizer",
            "editor": "editor",
            "finalize": "finalize"
        }
    )
    
    # Finalize ends the graph
    workflow.add_edge("finalize", END)
    
    return workflow.compile()


# Create the orchestration graph instance
new_orchestration_graph = build_orchestration_graph()
