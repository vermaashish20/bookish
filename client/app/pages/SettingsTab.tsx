'use client';

import React from 'react';
import SettingsPanel from '../components/SettingsPanel';

type ProviderType = 'Ollama' | 'Gemini' | 'Claude' | 'OpenAI' | 'Nvidia' | 'Custom';

interface SettingsTabProps {
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

export default function SettingsTab(props: SettingsTabProps) {
  return <SettingsPanel {...props} />;
}
