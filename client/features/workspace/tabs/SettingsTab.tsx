'use client';

import React from 'react';
import SettingsPanel from '@/components/workspace/SettingsPanel';
import type { LLMProvider } from '@/lib/types';

interface SettingsTabProps {
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

export default function SettingsTab(props: SettingsTabProps) {
  return <SettingsPanel {...props} />;
}
