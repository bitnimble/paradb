import { Axiom } from '@axiomhq/js';
import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { getEnvVars } from '../env';

let isConfigured = false;

function configureLogger() {
  if (isConfigured) {
    return;
  }

  const envVars = getEnvVars();
  const axiom = new Axiom({
    token: envVars.axiomApiToken,
  });

  configure({
    sinks: {
      console: getConsoleSink(),
      axiom: (record) => {
        axiom.ingest(envVars.axiomDataset, [
          {
            _time: record.timestamp,
            level: record.level,
            category: record.category.join('.'),
            message: record.message
              .map((m) => (typeof m === 'string' ? m : JSON.stringify(m)))
              .join(' '),
            properties: record.properties,
          },
        ]);
      },
    },
    filters: {},
    loggers: [
      {
        category: ['paradb'],
        lowestLevel: 'debug',
        sinks: ['console', 'axiom'],
      },
    ],
  });

  isConfigured = true;
}

export function getLog(category: string[]) {
  configureLogger();
  return getLogger(['paradb', ...category]);
}
