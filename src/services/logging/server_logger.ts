import { Axiom } from '@axiomhq/js';
import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { getEnvVars } from '../env';
import { getSingleton } from '../singleton';

function configureLogger() {
  return getSingleton('_serverLogger', () => {
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
        {
          category: ['logtape', 'meta'],
          lowestLevel: 'warning',
          sinks: ['console', 'axiom'],
        },
      ],
    });

    return true;
  });
}

export function getLog(category: string[]) {
  configureLogger();
  return getLogger(['paradb', ...category]);
}
