import { Axiom } from '@axiomhq/js';
import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { getSingleton } from '../singleton';

function configureLogger() {
  return getSingleton('_clientLogger', () => {
    const publicToken = process.env.NEXT_PUBLIC_AXIOM_API_TOKEN!;
    const dataset = process.env.NEXT_PUBLIC_AXIOM_DATASET!;
    const axiom = new Axiom({ token: publicToken });

    configure({
      sinks: {
        console: getConsoleSink(),
        axiom: (record) => {
          axiom.ingest(dataset, [
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

    return true;
  });
}

export function getLog(category: string[]) {
  configureLogger();
  return getLogger(['paradb', ...category]);
}
