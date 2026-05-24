'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSettings, saveSettings } from '@/lib/api';
import type { BookProject, LLMProvider, ModelConfig, ProjectSettings } from '@/lib/types';

const NVIDIA_DEFAULT_MODEL = 'mistralai/mistral-large-3-675b-instruct-2512';
const SARVAM_DEFAULT_MODEL = 'sarvam-105b';

type ModelKey = keyof ProjectSettings;

const DEFAULT_CONFIG: ModelConfig = {
  provider: 'Nvidia',
  modelName: NVIDIA_DEFAULT_MODEL,
  apiKey: '',
  endpointUrl: '',
};

const DEFAULT_SETTINGS: ProjectSettings = {
  plannerModel: { ...DEFAULT_CONFIG },
  writerModel: { ...DEFAULT_CONFIG },
  worldBuilderModel: { ...DEFAULT_CONFIG },
};

function isSupportedProvider(provider?: string): provider is LLMProvider {
  return provider === 'Nvidia' || provider === 'Sarvam';
}

function defaultModelForProvider(provider: LLMProvider): string {
  return provider === 'Sarvam' ? SARVAM_DEFAULT_MODEL : NVIDIA_DEFAULT_MODEL;
}

function normalizeModelConfig(config?: Partial<ModelConfig>): ModelConfig {
  const provider: LLMProvider = isSupportedProvider(config?.provider) ? config.provider : 'Nvidia';
  return {
    provider,
    modelName: config?.modelName ?? defaultModelForProvider(provider),
    apiKey: config?.apiKey ?? '',
    endpointUrl: '',
  };
}

function normalizeSettings(settings?: Partial<ProjectSettings>): ProjectSettings {
  return {
    plannerModel: normalizeModelConfig(settings?.plannerModel),
    writerModel: normalizeModelConfig(settings?.writerModel),
    worldBuilderModel: normalizeModelConfig(settings?.worldBuilderModel),
  };
}

export function useModelSettings(
  projectId: string,
  book: BookProject | null,
  updateBook: (b: BookProject) => void,
  settingsTabActive: boolean,
) {
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const applySettings = useCallback((incoming: Partial<ProjectSettings>) => {
    setSettings(normalizeSettings(incoming));
  }, []);

  const updateModelConfig = useCallback((key: ModelKey, patch: Partial<ModelConfig>) => {
    setSettings((current) => {
      const next = { ...current[key], ...patch };
      if (patch.provider && patch.provider !== current[key].provider) {
        if (!patch.modelName) next.modelName = defaultModelForProvider(patch.provider);
        if (patch.apiKey === undefined) next.apiKey = '';
      }
      return { ...current, [key]: next };
    });
    setSettingsSaved(false);
  }, []);

  useEffect(() => {
    if (book?.settings) {
      applySettings(book.settings);
    }
  }, [book?.settings, applySettings]);

  useEffect(() => {
    if (!settingsTabActive || !projectId) return;
    fetchSettings(projectId)
      .then((fetchedSettings) => applySettings(fetchedSettings as Partial<ProjectSettings>))
      .catch((err) => console.error('Failed to load settings', err));
  }, [settingsTabActive, projectId, applySettings]);

  const buildSettings = useCallback((): ProjectSettings => normalizeSettings(settings), [settings]);

  const save = useCallback(async () => {
    if (!book) return;
    setIsSavingSettings(true);
    setSettingsSaved(false);
    const newSettings = buildSettings();
    updateBook({ ...book, settings: newSettings });
    try {
      const response = await saveSettings(book.id, newSettings);
      const savedSettings = response.settings ?? newSettings;
      applySettings(savedSettings);
      updateBook({ ...book, settings: savedSettings });
    } catch (err) {
      console.warn('[Settings] Backend unreachable, saved locally only.', err);
    }
    setIsSavingSettings(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }, [applySettings, book, buildSettings, updateBook]);

  return {
    plannerProvider: settings.plannerModel.provider,
    setPlannerProvider: (provider: LLMProvider) => updateModelConfig('plannerModel', { provider }),
    plannerModel: settings.plannerModel.modelName,
    setPlannerModel: (modelName: string) => updateModelConfig('plannerModel', { modelName }),
    plannerApiKey: settings.plannerModel.apiKey ?? '',
    setPlannerApiKey: (apiKey: string) => updateModelConfig('plannerModel', { apiKey }),
    writerProvider: settings.writerModel.provider,
    setWriterProvider: (provider: LLMProvider) => updateModelConfig('writerModel', { provider }),
    writerModel: settings.writerModel.modelName,
    setWriterModel: (modelName: string) => updateModelConfig('writerModel', { modelName }),
    writerApiKey: settings.writerModel.apiKey ?? '',
    setWriterApiKey: (apiKey: string) => updateModelConfig('writerModel', { apiKey }),
    worldBuilderProvider: settings.worldBuilderModel.provider,
    setWorldBuilderProvider: (provider: LLMProvider) =>
      updateModelConfig('worldBuilderModel', { provider }),
    worldBuilderModel: settings.worldBuilderModel.modelName,
    setWorldBuilderModel: (modelName: string) => updateModelConfig('worldBuilderModel', { modelName }),
    worldBuilderApiKey: settings.worldBuilderModel.apiKey ?? '',
    setWorldBuilderApiKey: (apiKey: string) => updateModelConfig('worldBuilderModel', { apiKey }),
    isSavingSettings,
    settingsSaved,
    saveSettings: save,
  };
}
