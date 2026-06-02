'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSettings, saveSettings } from '@/lib/api';
import type { BookProject, LLMProvider, ModelConfig, ProjectSettings } from '@/lib/types';

const DEFAULT_MODEL = 'mistralai/mistral-large-3-675b-instruct-2512';

type ModelKey = keyof ProjectSettings;

type CredentialsState = {
  anthropicKey: string;
  geminiKey: string;
  openaiKey: string;
  openrouterKey: string;
  sarvamKey: string;
  nvidiaKey: string;
  ollamaEndpoint: string;
  customEndpoint: string;
  customApiKey: string;
};

const DEFAULT_CONFIG: ModelConfig = {
  provider: 'Nvidia',
  modelName: DEFAULT_MODEL,
  apiKey: '',
  endpointUrl: '',
};

const DEFAULT_SETTINGS: ProjectSettings = {
  plannerModel: { ...DEFAULT_CONFIG },
  writerModel: { ...DEFAULT_CONFIG },
  factCheckerModel: { ...DEFAULT_CONFIG },
  researcherModel: { ...DEFAULT_CONFIG },
  humanizerModel: { ...DEFAULT_CONFIG },
  editorModel: { ...DEFAULT_CONFIG },
  worldBuilderModel: { ...DEFAULT_CONFIG },
};

const DEFAULT_CREDENTIALS: CredentialsState = {
  anthropicKey: '',
  geminiKey: '',
  openaiKey: '',
  openrouterKey: '',
  sarvamKey: '',
  nvidiaKey: '',
  ollamaEndpoint: 'http://localhost:11434',
  customEndpoint: '',
  customApiKey: '',
};

function normalizeModelConfig(config?: Partial<ModelConfig>): ModelConfig {
  return {
    provider: config?.provider ?? DEFAULT_CONFIG.provider,
    modelName: config?.modelName ?? DEFAULT_CONFIG.modelName,
    apiKey: config?.apiKey ?? '',
    endpointUrl: config?.endpointUrl ?? '',
  };
}

function normalizeSettings(settings?: Partial<ProjectSettings>): ProjectSettings {
  return {
    plannerModel: normalizeModelConfig(settings?.plannerModel),
    writerModel: normalizeModelConfig(settings?.writerModel),
    factCheckerModel: normalizeModelConfig(settings?.factCheckerModel),
    researcherModel: normalizeModelConfig(settings?.researcherModel),
    humanizerModel: normalizeModelConfig(settings?.humanizerModel),
    editorModel: normalizeModelConfig(settings?.editorModel),
    worldBuilderModel: normalizeModelConfig(settings?.worldBuilderModel),
  };
}

function extractCredentials(settings: ProjectSettings): CredentialsState {
  const credentials = { ...DEFAULT_CREDENTIALS };
  const models = Object.values(settings);
  for (const model of models) {
    if (model.provider === 'Claude' && model.apiKey) credentials.anthropicKey = model.apiKey;
    if (model.provider === 'Gemini' && model.apiKey) credentials.geminiKey = model.apiKey;
    if (model.provider === 'OpenAI' && model.apiKey) credentials.openaiKey = model.apiKey;
    if (model.provider === 'OpenRouter' && model.apiKey) credentials.openrouterKey = model.apiKey;
    if (model.provider === 'Sarvam' && model.apiKey) credentials.sarvamKey = model.apiKey;
    if (model.provider === 'Nvidia' && model.apiKey) credentials.nvidiaKey = model.apiKey;
    if (model.provider === 'Ollama' && model.endpointUrl) credentials.ollamaEndpoint = model.endpointUrl;
    if (model.provider === 'Custom') {
      if (model.apiKey) credentials.customApiKey = model.apiKey;
      if (model.endpointUrl) credentials.customEndpoint = model.endpointUrl;
    }
  }
  return credentials;
}

export function useModelSettings(
  projectId: string,
  book: BookProject | null,
  updateBook: (b: BookProject) => void,
  settingsTabActive: boolean,
) {
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [credentials, setCredentials] = useState<CredentialsState>(DEFAULT_CREDENTIALS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const applySettings = useCallback((incoming: Partial<ProjectSettings>) => {
    const normalized = normalizeSettings(incoming);
    setSettings(normalized);
    setCredentials(extractCredentials(normalized));
  }, []);

  const updateModelConfig = useCallback(
    (key: ModelKey, patch: Partial<ModelConfig>) => {
      setSettings((current) => ({
        ...current,
        [key]: {
          ...current[key],
          ...patch,
        },
      }));
      setSettingsSaved(false);
    },
    [],
  );

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

  const buildSettings = useCallback((): ProjectSettings => {
    const resolveKey = (provider: LLMProvider) => {
      switch (provider) {
        case 'Claude': return credentials.anthropicKey;
        case 'Gemini': return credentials.geminiKey;
        case 'OpenAI': return credentials.openaiKey;
        case 'OpenRouter': return credentials.openrouterKey;
        case 'Sarvam': return credentials.sarvamKey;
        case 'Nvidia': return credentials.nvidiaKey;
        case 'Custom': return credentials.customApiKey;
        default: return '';
      }
    };
    const resolveEndpoint = (provider: LLMProvider) => {
      if (provider === 'Ollama') return credentials.ollamaEndpoint;
      if (provider === 'Custom') return credentials.customEndpoint;
      return '';
    };
    const withCredential = (config: ModelConfig): ModelConfig => ({
      ...config,
      apiKey: resolveKey(config.provider),
      endpointUrl: resolveEndpoint(config.provider),
    });
    return {
      plannerModel: withCredential(settings.plannerModel),
      writerModel: withCredential(settings.writerModel),
      factCheckerModel: withCredential(settings.factCheckerModel),
      researcherModel: withCredential(settings.researcherModel),
      humanizerModel: withCredential(settings.humanizerModel),
      editorModel: withCredential(settings.editorModel),
      worldBuilderModel: withCredential(settings.worldBuilderModel),
    };
  }, [credentials, settings]);

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
    writerProvider: settings.writerModel.provider,
    setWriterProvider: (provider: LLMProvider) => updateModelConfig('writerModel', { provider }),
    writerModel: settings.writerModel.modelName,
    setWriterModel: (modelName: string) => updateModelConfig('writerModel', { modelName }),
    checkerProvider: settings.factCheckerModel.provider,
    setCheckerProvider: (provider: LLMProvider) => updateModelConfig('factCheckerModel', { provider }),
    checkerModel: settings.factCheckerModel.modelName,
    setCheckerModel: (modelName: string) => updateModelConfig('factCheckerModel', { modelName }),
    researcherProvider: settings.researcherModel.provider,
    setResearcherProvider: (provider: LLMProvider) => updateModelConfig('researcherModel', { provider }),
    researcherModel: settings.researcherModel.modelName,
    setResearcherModel: (modelName: string) => updateModelConfig('researcherModel', { modelName }),
    humanizerProvider: settings.humanizerModel.provider,
    setHumanizerProvider: (provider: LLMProvider) => updateModelConfig('humanizerModel', { provider }),
    humanizerModel: settings.humanizerModel.modelName,
    setHumanizerModel: (modelName: string) => updateModelConfig('humanizerModel', { modelName }),
    editorProvider: settings.editorModel.provider,
    setEditorProvider: (provider: LLMProvider) => updateModelConfig('editorModel', { provider }),
    editorModel: settings.editorModel.modelName,
    setEditorModel: (modelName: string) => updateModelConfig('editorModel', { modelName }),
    worldBuilderProvider: settings.worldBuilderModel.provider,
    setWorldBuilderProvider: (provider: LLMProvider) => updateModelConfig('worldBuilderModel', { provider }),
    worldBuilderModel: settings.worldBuilderModel.modelName,
    setWorldBuilderModel: (modelName: string) => updateModelConfig('worldBuilderModel', { modelName }),
    anthropicKey: credentials.anthropicKey,
    setAnthropicKey: (anthropicKey: string) => {
      setCredentials((current) => ({ ...current, anthropicKey }));
      setSettingsSaved(false);
    },
    geminiKey: credentials.geminiKey,
    setGeminiKey: (geminiKey: string) => {
      setCredentials((current) => ({ ...current, geminiKey }));
      setSettingsSaved(false);
    },
    openaiKey: credentials.openaiKey,
    setOpenaiKey: (openaiKey: string) => {
      setCredentials((current) => ({ ...current, openaiKey }));
      setSettingsSaved(false);
    },
    openrouterKey: credentials.openrouterKey,
    setOpenrouterKey: (openrouterKey: string) => {
      setCredentials((current) => ({ ...current, openrouterKey }));
      setSettingsSaved(false);
    },
    sarvamKey: credentials.sarvamKey,
    setSarvamKey: (sarvamKey: string) => {
      setCredentials((current) => ({ ...current, sarvamKey }));
      setSettingsSaved(false);
    },
    nvidiaKey: credentials.nvidiaKey,
    setNvidiaKey: (nvidiaKey: string) => {
      setCredentials((current) => ({ ...current, nvidiaKey }));
      setSettingsSaved(false);
    },
    ollamaEndpoint: credentials.ollamaEndpoint,
    setOllamaEndpoint: (ollamaEndpoint: string) => {
      setCredentials((current) => ({ ...current, ollamaEndpoint }));
      setSettingsSaved(false);
    },
    customEndpoint: credentials.customEndpoint,
    setCustomEndpoint: (customEndpoint: string) => {
      setCredentials((current) => ({ ...current, customEndpoint }));
      setSettingsSaved(false);
    },
    customApiKey: credentials.customApiKey,
    setCustomApiKey: (customApiKey: string) => {
      setCredentials((current) => ({ ...current, customApiKey }));
      setSettingsSaved(false);
    },
    isSavingSettings,
    settingsSaved,
    saveSettings: save,
  };
}
