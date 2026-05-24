'use client';

import React from 'react';

type ProviderType = 'Ollama' | 'Gemini' | 'Claude' | 'OpenAI' | 'Nvidia' | 'Custom';

interface SettingsPanelProps {
  plannerProvider: ProviderType;
  setPlannerProvider: (value: ProviderType) => void;
  plannerModel: string;
  setPlannerModel: (value: string) => void;
  writerProvider: ProviderType;
  setWriterProvider: (value: ProviderType) => void;
  writerModel: string;
  setWriterModel: (value: string) => void;
  checkerProvider: ProviderType;
  setCheckerProvider: (value: ProviderType) => void;
  checkerModel: string;
  setCheckerModel: (value: string) => void;
  anthropicKey: string;
  setAnthropicKey: (value: string) => void;
  geminiKey: string;
  setGeminiKey: (value: string) => void;
  openaiKey: string;
  setOpenaiKey: (value: string) => void;
  nvidiaKey: string;
  setNvidiaKey: (value: string) => void;
  ollamaEndpoint: string;
  setOllamaEndpoint: (value: string) => void;
  customEndpoint: string;
  setCustomEndpoint: (value: string) => void;
  customApiKey: string;
  setCustomApiKey: (value: string) => void;
  isSavingSettings: boolean;
  settingsSaved: boolean;
  onSaveSettings: () => void;
}

export default function SettingsPanel(props: SettingsPanelProps) {
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-zinc-50 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6 font-sans">
        <div>
          <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">Model Routing Settings</h2>
          <p className="text-[10px] text-zinc-500 mt-1">Configure orchestration providers, parameters, and credentials for active planner and writer agents.</p>
        </div>

        {/* Agent selectors card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
          <h3 className="text-xs font-bold text-zinc-800 border-b border-zinc-100 pb-2 uppercase tracking-wide">LLM Router Assignments</h3>

          {(['Planner', 'Writer', 'Fact-Checker'] as const).map((label) => {
            const isChecker = label === 'Fact-Checker';
            const provider = isChecker ? props.checkerProvider : label === 'Planner' ? props.plannerProvider : props.writerProvider;
            const setProvider = isChecker ? props.setCheckerProvider : label === 'Planner' ? props.setPlannerProvider : props.setWriterProvider;
            const model = isChecker ? props.checkerModel : label === 'Planner' ? props.plannerModel : props.writerModel;
            const setModel = isChecker ? props.setCheckerModel : label === 'Planner' ? props.setPlannerModel : props.setWriterModel;

            return (
              <div key={label} className="grid gap-4 sm:grid-cols-3 items-center">
                <span className="text-xs font-semibold text-zinc-700">{label} Agent Node</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                >
                  <option value="Claude">Anthropic Claude</option>
                  <option value="Gemini">Google Gemini</option>
                  <option value="OpenAI">OpenAI GPT-4</option>
                  <option value="Nvidia">NVIDIA NIM</option>
                  <option value="Ollama">Ollama (Localhost)</option>
                  <option value="Custom">Custom Endpoint</option>
                </select>
                <input
                  type="text"
                  placeholder="Model Name"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                />
              </div>
            );
          })}
        </div>

        {/* API Credentials card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-zinc-800 border-b border-zinc-100 pb-2 uppercase tracking-wide">Credentials & Connection Endpoints</h3>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-400 uppercase">Anthropic API Key</label>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={props.anthropicKey}
              onChange={(e) => props.setAnthropicKey(e.target.value)}
              className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-400 uppercase">Google Gemini API Key</label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={props.geminiKey}
              onChange={(e) => props.setGeminiKey(e.target.value)}
              className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-400 uppercase">OpenAI API Key</label>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={props.openaiKey}
              onChange={(e) => props.setOpenaiKey(e.target.value)}
              className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
            />
          </div>
          
          <div className="space-y-1.5 rounded-md border border-green-100 bg-green-50/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <label className="text-[9px] font-bold text-green-700 uppercase tracking-wider">NVIDIA NIM API Key</label>
              <span className="text-[8px] text-green-500 font-mono bg-green-100 px-1 py-0.5 rounded">integrate.api.nvidia.com</span>
            </div>
            <input
              type="password"
              placeholder="nvapi-..."
              value={props.nvidiaKey}
              onChange={(e) => props.setNvidiaKey(e.target.value)}
              className="w-full rounded border border-green-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-green-400"
            />
            <p className="text-[9px] text-green-600 mt-1">Default model: <span className="font-mono">mistralai/mistral-large-3-675b-instruct-2512</span></p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-zinc-400 uppercase">Ollama Local API Endpoint</label>
            <input
              type="text"
              placeholder="http://localhost:11434"
              value={props.ollamaEndpoint}
              onChange={(e) => props.setOllamaEndpoint(e.target.value)}
              className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
            />
          </div>
          
          <div className="space-y-2 rounded-md border border-indigo-100 bg-indigo-50/40 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <label className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Custom LLM Endpoint</label>
              <span className="text-[8px] text-indigo-400 font-mono bg-indigo-100 px-1 py-0.5 rounded">OpenAI-compatible</span>
            </div>
            <input
              type="text"
              placeholder="https://your-llm-host.com/v1"
              value={props.customEndpoint}
              onChange={(e) => props.setCustomEndpoint(e.target.value)}
              className="w-full rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-400"
            />
            <input
              type="password"
              placeholder="Bearer token / API key for custom endpoint"
              value={props.customApiKey}
              onChange={(e) => props.setCustomApiKey(e.target.value)}
              className="w-full rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-indigo-400"
            />
            <p className="text-[9px] text-indigo-500">Any OpenAI-compatible API - LM Studio, vLLM, Together AI, Groq, etc.</p>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <button
              onClick={props.onSaveSettings}
              disabled={props.isSavingSettings}
              className={`rounded px-4 py-2 text-xs font-semibold text-white transition shadow-sm w-full flex items-center justify-center gap-2 ${
                props.settingsSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-zinc-950 hover:bg-zinc-800'
              } disabled:opacity-60`}
            >
              {props.isSavingSettings && (
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {props.settingsSaved ? 'Configuration Saved' : props.isSavingSettings ? 'Saving...' : 'Save Configuration Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
