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
| MessagePack | 9.79 MB | 4.29 MB |

## Разные уровни gzip-сжатия

| Формат | Уровень gzip | Размер после сжатия | Уменьшение размера | Осталось от исходного |
| --- | ---: | ---: | ---: | ---: |
| CSV | 1 | 4.26 MB | 57.37% | 42.63% |
| CSV | 3 | 4.24 MB | 57.57% | 42.43% |
| CSV | 6 | 4.11 MB | 58.87% | 41.13% |
| CSV | 9 | 4.11 MB | 58.88% | 41.12% |
| MessagePack | 1 | 4.48 MB | 54.25% | 45.75% |
| MessagePack | 3 | 4.39 MB | 55.15% | 44.85% |
| MessagePack | 6 | 4.29 MB | 56.14% | 43.86% |
| MessagePack | 9 | 4.29 MB | 56.20% | 43.80% |

## Результаты обработки

| Формат | Количество записей | Общее время | Время до первой записи | Пиковая RSS память | Пиковая heap память |
| --- | ---: | ---: | ---: | ---: | ---: |
| CSV streaming | 203984 | 130.42 ms | 1.41 ms | 97.03 MB | 17.35 MB |
| MessagePack streaming | 203984 | 94.57 ms | 5.49 ms | 133.27 MB | 31.86 MB |

## Выводы

MessagePack в несжатом виде оказался немного меньше CSV: `9.79 MB` против `10.00 MB`.

После gzip CSV оказался немного меньше: `4.11 MB` против `4.29 MB` у MessagePack.
CSV хорошо сжимается, потому что в текстовых данных много повторяющихся фрагментов: домен email, похожие строки и одинаковая структура записей.

Разные уровни gzip показали, что высокий уровень сжатия почти не меняет результат.
Для CSV уровень `1` даёт `4.26 MB`, а уровень `9` - `4.11 MB`.
Для MessagePack уровень `1` даёт `4.48 MB`, а уровень `9` - `4.29 MB`.
То есть основной выигрыш появляется уже на первом уровне, а дальнейшее увеличение уровня даёт небольшой дополнительный эффект.
MessagePack изначально компактнее CSV без сжатия, но после gzip CSV становится немного меньше, потому что текстовые повторяющиеся шаблоны хорошо сжимаются.

По общему времени MessagePack streaming оказался быстрее CSV streaming: `94.57 ms` против `130.42 ms`.
CSV-парсеру приходится разбирать текстовые строки, искать разделители и учитывать кавычки.

CSV начал отдавать первую запись быстрее: `1.41 ms` против `5.49 ms` у MessagePack.

По памяти CSV streaming оказался экономнее: `17.35 MB` heap против `31.86 MB` у MessagePack.

Также важно учитывать сложность CSV-парсера.
Простой CSV на `line.split(",")` может работать быстрее, но он некорректен для значений с разделителем внутри кавычек, например `"user,name"`.
Более корректный CSV-парсер с поддержкой кавычек работает медленнее, потому что разбирает строку посимвольно.

Итог: MessagePack streaming быстрее CSV по общему времени и немного компактнее без сжатия. CSV streaming быстрее отдаёт первую запись и потребляет меньше heap-памяти. Оба варианта подходят для больших файлов, потому что данные читаются потоком и не загружаются целиком в память.


<details>
  <summary>Решение</summary>

  ```ts
declare const require: any;
declare const process: any;

export {};

const fs = require("node:fs");
const readline = require("node:readline");
const zlib = require("node:zlib");
const { PackrStream, UnpackrStream } = require("msgpackr");
const { performance: nodePerformance } = require("node:perf_hooks");

const csvFile = "./very-big-csv";
const msgpackFile = "./very-big-msgpack.msgpack";

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

function createMessagePackFile(csvPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const packrStream = new PackrStream();

    packrStream.pipe(output);

    parseCSV(
      csvPath,
      ",",
      (err, row) => {
        if (err != null) {
          reject(err);
          return;
        }

        if (row[0] === "id") {
          return;
        }

        packrStream.write({
          id: Number(row[0]),
          email: row[1],
          password: row[2],
        });
      },
      () => {
        packrStream.end();
      }
    );

    output.once("finish", () => {
      resolve();
    });

    output.once("error", (err: Error) => {
      reject(err);
    });

    packrStream.once("error", (err: Error) => {
      reject(err);
    });
  });
}

function benchmarkMessagePack(file: string): Promise<BenchmarkResult> {
  return new Promise((resolve, reject) => {
    let rowsCount = 0;
    let firstRowTimeMs: number | null = null;
    let peakMemory = getMemoryInfo();

    const start = nodePerformance.now();
    const input = fs.createReadStream(file);
    const unpackrStream = new UnpackrStream();

    input.pipe(unpackrStream);

    unpackrStream.on("data", () => {
      if (firstRowTimeMs === null) {
        firstRowTimeMs = nodePerformance.now() - start;
      }

      rowsCount++;

      if (rowsCount % 1000 === 0) {
        peakMemory = maxMemory(peakMemory, getMemoryInfo());
      }
    });

    unpackrStream.once("end", () => {
      peakMemory = maxMemory(peakMemory, getMemoryInfo());

      resolve({
        name: "MessagePack streaming",
        rowsCount,
        totalTimeMs: nodePerformance.now() - start,
        firstRowTimeMs,
        peakMemory,
      });
    });

    input.once("error", (err: Error) => {
      reject(err);
    });

    unpackrStream.once("error", (err: Error) => {
      reject(err);
    });
  });
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
  const msgpackSizes = getFileSizes(msgpackFile);

  console.log("\nРазмеры файлов");
  console.log("CSV:", formatMb(csvSizes.rawBytes));
  console.log("CSV gzip:", formatMb(csvSizes.gzipBytes));
  console.log("MessagePack:", formatMb(msgpackSizes.rawBytes));
  console.log("MessagePack gzip:", formatMb(msgpackSizes.gzipBytes));
}

async function main() {
  if (!fs.existsSync(msgpackFile)) {
    console.log("Создание MessagePack-файла...");
    await createMessagePackFile(csvFile, msgpackFile);
  }

  const csvResult = await benchmarkCSV(csvFile, ",");
  printBenchmark(csvResult);

  const msgpackResult = await benchmarkMessagePack(msgpackFile);
  printBenchmark(msgpackResult);

  printFileSizes();
}

main().catch((err: Error) => {
  console.error("Ошибка:", err);
});
  ```

</details>