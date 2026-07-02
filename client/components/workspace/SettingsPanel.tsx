'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LLMProvider } from '@/lib/types';

interface SettingsPanelProps {
  plannerProvider: LLMProvider;
  setPlannerProvider: (value: LLMProvider) => void;
  plannerModel: string;
  setPlannerModel: (value: string) => void;
  plannerApiKey: string;
  setPlannerApiKey: (value: string) => void;
  writerProvider: LLMProvider;
  setWriterProvider: (value: LLMProvider) => void;
  writerModel: string;
  setWriterModel: (value: string) => void;
  writerApiKey: string;
  setWriterApiKey: (value: string) => void;
  worldBuilderProvider: LLMProvider;
  setWorldBuilderProvider: (value: LLMProvider) => void;
  worldBuilderModel: string;
  setWorldBuilderModel: (value: string) => void;
  worldBuilderApiKey: string;
  setWorldBuilderApiKey: (value: string) => void;
  isSavingSettings: boolean;
  settingsSaved: boolean;
  onSaveSettings: () => void;
}

const cellInputClass =
  'w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-[13px] text-[var(--bookish-ink)] outline-none transition placeholder:text-[var(--bookish-muted)]/70 hover:border-[var(--bookish-line)] focus:border-[var(--bookish-line)] focus:bg-white';

const cellMonoClass = `${cellInputClass} font-mono text-[12px]`;

const PROVIDER_OPTIONS: { value: LLMProvider; label: string }[] = [
  { value: 'Nvidia', label: 'NVIDIA NIM' },
  { value: 'Sarvam', label: 'Sarvam AI' },
];

function ProviderSelect({
  value,
  onChange,
}: {
  value: LLMProvider;
  onChange: (value: LLMProvider) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as LLMProvider)}>
      <SelectTrigger
        size="sm"
        className="h-8 w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 text-[13px] text-[var(--bookish-ink)] shadow-none transition hover:border-[var(--bookish-line)] focus-visible:border-[var(--bookish-line)] focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[rgb(5_150_105/0.08)] data-[size=sm]:h-8"
      >
        <SelectValue placeholder="Select provider" />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={4}
        align="start"
        className="min-w-[10rem] rounded-lg border-[var(--bookish-line)] bg-white p-1 shadow-lg"
      >
        {PROVIDER_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-md py-1.5 pr-8 pl-2.5 text-[13px] text-[var(--bookish-ink)] focus:bg-[var(--bookish-accent-soft)] focus:text-[var(--bookish-accent)]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function modelPlaceholder(provider: LLMProvider): string {
  return provider === 'Sarvam'
    ? 'sarvam-105b'
    : 'mistralai/mistral-large-3-675b-instruct-2512';
}

function apiKeyPlaceholder(provider: LLMProvider): string {
  return provider === 'Sarvam' ? 'Optional' : 'nvapi-…';
}

type AgentRowConfig = {
  name: string;
  role: string;
  provider: LLMProvider;
  onProviderChange: (value: LLMProvider) => void;
  model: string;
  onModelChange: (value: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
};

function AgentTableRow({
  name,
  role,
  provider,
  onProviderChange,
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
}: AgentRowConfig) {
  return (
    <tr className="border-b border-[var(--bookish-line)] last:border-b-0">
      <td className="px-4 py-3 align-middle">
        <p className="font-medium text-[var(--bookish-ink)]">{name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--bookish-muted)]">{role}</p>
      </td>
      <td className="px-4 py-3 align-middle">
        <ProviderSelect value={provider} onChange={onProviderChange} />
      </td>
      <td className="px-4 py-3 align-middle">
        <input
          type="text"
          placeholder={modelPlaceholder(provider)}
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className={cellMonoClass}
        />
      </td>
      <td className="px-4 py-3 align-middle">
        <input
          type="password"
          placeholder={apiKeyPlaceholder(provider)}
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          className={cellMonoClass}
        />
      </td>
    </tr>
  );
}

export default function SettingsPanel(props: SettingsPanelProps) {
  const rows: AgentRowConfig[] = [
    {
      name: 'Planner',
      role: 'Orchestration and task routing',
      provider: props.plannerProvider,
      onProviderChange: props.setPlannerProvider,
      model: props.plannerModel,
      onModelChange: props.setPlannerModel,
      apiKey: props.plannerApiKey,
      onApiKeyChange: props.setPlannerApiKey,
    },
    {
      name: 'Writer',
      role: 'Drafts, revisions, and polish',
      provider: props.writerProvider,
      onProviderChange: props.setWriterProvider,
      model: props.writerModel,
      onModelChange: props.setWriterModel,
      apiKey: props.writerApiKey,
      onApiKeyChange: props.setWriterApiKey,
    },
    {
      name: 'World builder',
      role: 'Lore, characters, and canon',
      provider: props.worldBuilderProvider,
      onProviderChange: props.setWorldBuilderProvider,
      model: props.worldBuilderModel,
      onModelChange: props.setWorldBuilderModel,
      apiKey: props.worldBuilderApiKey,
      onApiKeyChange: props.setWorldBuilderApiKey,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bookish-paper)]">
      <div className="max-w-6xl px-8 py-8">
        <header className="mb-5">
          <h1 className="text-[15px] font-semibold tracking-tight text-[var(--bookish-ink)]">
            Model routing
          </h1>
          <p className="mt-1 text-[12px] text-[var(--bookish-muted)]">
            Set provider, model, and API key per agent. Leave keys blank to use server env vars.
          </p>
        </header>

        <div className="overflow-hidden rounded-lg border border-[var(--bookish-line)]">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[32%]" />
              <col className="w-[28%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--bookish-line)] bg-[#f4f4f5]">
                <th className="px-4 py-2 text-[11px] font-semibold text-[var(--bookish-muted)]">
                  Agent
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold text-[var(--bookish-muted)]">
                  Provider
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold text-[var(--bookish-muted)]">
                  Model
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold text-[var(--bookish-muted)]">
                  API key
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--bookish-paper)]">
              {rows.map((row) => (
                <AgentTableRow key={row.name} {...row} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={props.onSaveSettings}
            disabled={props.isSavingSettings}
            className={`workspace-btn workspace-btn--primary min-w-[10rem] ${
              props.settingsSaved ? 'bg-emerald-700 hover:bg-emerald-800' : ''
            }`}
          >
            {props.isSavingSettings && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {props.settingsSaved
              ? 'Saved'
              : props.isSavingSettings
                ? 'Saving…'
                : 'Save configuration'}
          </button>
          {props.settingsSaved && (
            <span className="text-[12px] text-[var(--bookish-muted)]">Changes applied to this project.</span>
          )}
        </div>
      </div>
    </div>
  );
}
