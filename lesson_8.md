## Данные

Структура одной записи:

```ts
{
  id: number;
  email: string;
  password: string;
}
```

Количество записей: `203984`.

CSV-файл дополнительно содержит строку заголовка:

```csv
id,email,password
```

## Размеры файлов

| Формат | Без сжатия | gzip |
| --- | ---: | ---: |
| CSV | 10.00 MB | 4.11 MB |
| JSON | 16.03 MB | 4.24 MB |

## Разные уровни gzip-сжатия

| Формат | Уровень gzip | Размер после сжатия | Уменьшение размера | Осталось от исходного |
| --- | ---: | ---: | ---: | ---: |
| CSV | 1 | 4.26 MB | 57.37% | 42.63% |
| CSV | 3 | 4.24 MB | 57.57% | 42.43% |
| CSV | 6 | 4.11 MB | 58.87% | 41.13% |
| CSV | 9 | 4.11 MB | 58.88% | 41.12% |
| JSON | 1 | 4.37 MB | 72.73% | 27.27% |
| JSON | 3 | 4.37 MB | 72.76% | 27.24% |
| JSON | 6 | 4.24 MB | 73.57% | 26.43% |
| JSON | 9 | 4.21 MB | 73.74% | 26.26% |

## Результаты обработки

| Формат | Количество записей | Общее время | Время до первой записи | Пиковая RSS память | Пиковая heap память |
| --- | ---: | ---: | ---: | ---: | ---: |
| CSV streaming | 203984 | 130.79 ms | 1.73 ms | 112.03 MB | 14.57 MB |
| JSON.parse | 203984 | 80.22 ms | 80.22 ms | 208.13 MB | 49.16 MB |

## Выводы

CSV в несжатом виде оказался меньше JSON: `10.00 MB` против `16.03 MB`.
Это происходит потому, что CSV не хранит названия полей в каждой записи, а JSON повторяет ключи `id`, `email` и `password` для каждого объекта.

После gzip разница почти исчезла: `4.11 MB` у CSV против `4.24 MB` у JSON.
JSON хорошо сжимается, потому что в нём много повторяющихся ключей и структурных символов.

При сравнении разных уровней gzip видно, что основной эффект достигается уже на низких уровнях.
Для CSV уровень `1` даёт `4.26 MB`, а уровень `9` - `4.11 MB`.
Разница всего около `0.15 MB`, поэтому максимальный уровень сжатия почти не даёт дополнительной пользы.
Для JSON картина похожая: уровень `1` даёт `4.37 MB`, а уровень `9` - `4.21 MB`.
JSON сжимается сильнее в процентах, потому что в нём постоянно повторяются ключи объектов.

Поточный CSV-парсер начал отдавать данные почти сразу: первая запись была получена через `1.73 ms`.
У `JSON.parse` время до первой записи равно общему времени обработки, потому что сначала нужно прочитать и распарсить весь файл целиком.

По общему времени `JSON.parse` оказался быстрее: `80.22 ms` против `130.79 ms`.

По памяти CSV streaming оказался эффективнее.
Пиковая heap-память у CSV составила `14.57 MB`, а у JSON - `49.16 MB`.

Также важно учитывать сложность CSV-парсера.
Если использовать простой вариант через `line.split(",")`, CSV может работать быстрее, потому что такая версия почти не анализирует формат.
Но такой подход ломается на значениях с разделителем внутри кавычек, например `"user,name"`.
В реализации с поддержкой кавычек строка разбирается посимвольно, поэтому парсер становится медленнее, но корректнее.

Итог: CSV streaming лучше подходит для больших файлов, когда важно быстро начать обработку и не держать все данные в памяти. `JSON.parse` может быть быстрее по общему времени на умеренных объёмах, но требует больше памяти и не позволяет получать записи до полного чтения и парсинга файла.


<details>
  <summary>Решение</summary>

  ```ts
declare const require: any;
declare const process: any;

export {};

const fs = require("node:fs");
const readline = require("node:readline");
const zlib = require("node:zlib");
const { performance: nodePerformance } = require("node:perf_hooks");

const csvFile = "./very-big-csv";
const jsonFile = "./very-big-json.json";

type MemoryInfo = {
  rssMb: number;
  heapUsedMb: number;
};

type BenchmarkResult = {
  name: string;
  rowsCount: number;
  totalTimeMs: number;
  firstRowTimeMs: number | null;
  peakMemory: MemoryInfo;
};

function parseCSV(
  file: string,
  separator: string,
  cb: (err: Error | null, data: string[]) => void,
  onEnd: () => void
) {
  const stream = fs.createReadStream(file);

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  rl.on("error", (err: Error) => {
    cb(err, []);
  });

  rl.on("line", (line: string) => {
    cb(null, parseCSVLine(line, separator));
  });

  rl.once("close", () => {
    onEnd();
  });
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && line.startsWith(separator, i)) {
      result.push(current);
      current = "";
      i += separator.length - 1;
      continue;
    }

    current += char;
  }

  result.push(current);

  return result;
}

function getMemoryInfo(): MemoryInfo {
  const memory = process.memoryUsage();

  return {
    rssMb: memory.rss / 1024 / 1024,
    heapUsedMb: memory.heapUsed / 1024 / 1024,
  };
}

function maxMemory(a: MemoryInfo, b: MemoryInfo): MemoryInfo {
  return {
    rssMb: Math.max(a.rssMb, b.rssMb),
    heapUsedMb: Math.max(a.heapUsedMb, b.heapUsedMb),
  };
}

function benchmarkCSV(file: string, separator: string): Promise<BenchmarkResult> {
  return new Promise((resolve, reject) => {
    let rowsCount = 0;
    let lineNumber = 0;
    let firstRowTimeMs: number | null = null;
    let peakMemory = getMemoryInfo();

    const start = nodePerformance.now();

    parseCSV(
      file,
      separator,
      (err) => {
        if (err != null) {
          reject(err);
          return;
        }

        lineNumber++;

        if (lineNumber === 1) {
          return;
        }

        if (firstRowTimeMs === null) {
          firstRowTimeMs = nodePerformance.now() - start;
        }

        rowsCount++;

        if (rowsCount % 1000 === 0) {
          peakMemory = maxMemory(peakMemory, getMemoryInfo());
        }
      },
      () => {
        peakMemory = maxMemory(peakMemory, getMemoryInfo());

        resolve({
          name: "CSV streaming",
          rowsCount,
          totalTimeMs: nodePerformance.now() - start,
          firstRowTimeMs,
          peakMemory,
        });
      }
    );
  });
}

function benchmarkJSON(file: string): BenchmarkResult {
  let peakMemory = getMemoryInfo();
  const start = nodePerformance.now();

  const raw = fs.readFileSync(file, "utf-8");
  peakMemory = maxMemory(peakMemory, getMemoryInfo());

  const data = JSON.parse(raw);
  peakMemory = maxMemory(peakMemory, getMemoryInfo());

  const totalTimeMs = nodePerformance.now() - start;

  return {
    name: "JSON.parse",
    rowsCount: data.length,
    totalTimeMs,
    firstRowTimeMs: totalTimeMs,
    peakMemory,
  };
}

function getFileSizes(file: string) {
  const raw = fs.readFileSync(file);
  const compressed = zlib.gzipSync(raw);

  return {
    rawBytes: raw.length,
    gzipBytes: compressed.length,
  };
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function printBenchmark(result: BenchmarkResult) {
  console.log(`\n${result.name}`);
  console.log("Количество записей:", result.rowsCount);
  console.log("Общее время:", `${result.totalTimeMs.toFixed(2)} ms`);
  console.log(
    "Время до первой записи:",
    result.firstRowTimeMs === null ? "нет данных" : `${result.firstRowTimeMs.toFixed(2)} ms`
  );
  console.log("Пиковая RSS память:", `${result.peakMemory.rssMb.toFixed(2)} MB`);
  console.log("Пиковая heap память:", `${result.peakMemory.heapUsedMb.toFixed(2)} MB`);
}

function printFileSizes() {
  const csvSizes = getFileSizes(csvFile);
  const jsonSizes = getFileSizes(jsonFile);

  console.log("\nРазмеры файлов");
  console.log("CSV:", formatMb(csvSizes.rawBytes));
  console.log("CSV gzip:", formatMb(csvSizes.gzipBytes));
  console.log("JSON:", formatMb(jsonSizes.rawBytes));
  console.log("JSON gzip:", formatMb(jsonSizes.gzipBytes));
}

async function main() {
  const csvResult = await benchmarkCSV(csvFile, ",");
  printBenchmark(csvResult);

  const jsonResult = benchmarkJSON(jsonFile);
  printBenchmark(jsonResult);

  printFileSizes();
}

main().catch((err: Error) => {
  console.error("Ошибка:", err);
});
  ```

</details>