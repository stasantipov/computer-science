```ts
type RGBA = [red: number, green: number, blue: number, alpha: number];

enum TraverseMode {
    RowMajor = 'RowMajor',
    ColMajor = 'ColMajor'
}

interface PixelStream {
    getPixel(x: number, y: number): RGBA;
    setPixel(x: number, y: number, rgba: RGBA): RGBA;
    forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void;
}

type PixelObject = {
    r: number;
    g: number;
    b: number;
    a: number;
};

type PixelStreamFactory = (width: number, height: number) => PixelStream;

abstract class BasePixelStream implements PixelStream {
    constructor(
        protected readonly width: number,
        protected readonly height: number
    ) {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
            throw new Error('Ширина и высота должны быть положительными целыми числами');
        }
    }

    abstract getPixel(x: number, y: number): RGBA;
    abstract setPixel(x: number, y: number, rgba: RGBA): RGBA;
    abstract forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void;

    protected getPixelIndex(x: number, y: number): number {
        this.assertInBounds(x, y);

        return y * this.width + x;
    }

    protected getChannelIndex(x: number, y: number): number {
        return this.getPixelIndex(x, y) * 4;
    }

    protected assertInBounds(x: number, y: number): void {
        if (
            !Number.isInteger(x) ||
            !Number.isInteger(y) ||
            x < 0 ||
            y < 0 ||
            x >= this.width ||
            y >= this.height
        ) {
            throw new RangeError(`Координаты (${x}, ${y}) выходят за пределы изображения`);
        }
    }
}

class FlatArrayPixelStream extends BasePixelStream {
    private readonly data: number[];

    constructor(width: number, height: number) {
        super(width, height);
        this.data = new Array(width * height * 4).fill(0);
    }

    getPixel(x: number, y: number): RGBA {
        const offset = this.getChannelIndex(x, y);

        return [
            this.data[offset],
            this.data[offset + 1],
            this.data[offset + 2],
            this.data[offset + 3]
        ];
    }

    setPixel(x: number, y: number, rgba: RGBA): RGBA {
        const offset = this.getChannelIndex(x, y);

        this.data[offset] = rgba[0];
        this.data[offset + 1] = rgba[1];
        this.data[offset + 2] = rgba[2];
        this.data[offset + 3] = rgba[3];

        return rgba;
    }

    forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void {
        traversePixels(this.width, this.height, mode, (x, y) => {
            const offset = (y * this.width + x) * 4;

            callback(
                [
                    this.data[offset],
                    this.data[offset + 1],
                    this.data[offset + 2],
                    this.data[offset + 3]
                ],
                x,
                y
            );
        });
    }
}

class ArrayOfArraysPixelStream extends BasePixelStream {
    private readonly data: RGBA[];

    constructor(width: number, height: number) {
        super(width, height);
        this.data = Array.from({ length: width * height }, () => [0, 0, 0, 0]);
    }

    getPixel(x: number, y: number): RGBA {
        const pixel = this.data[this.getPixelIndex(x, y)];

        return [pixel[0], pixel[1], pixel[2], pixel[3]];
    }

    setPixel(x: number, y: number, rgba: RGBA): RGBA {
        this.data[this.getPixelIndex(x, y)] = [rgba[0], rgba[1], rgba[2], rgba[3]];

        return rgba;
    }

    forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void {
        traversePixels(this.width, this.height, mode, (x, y) => {
            const pixel = this.data[y * this.width + x];

            callback([pixel[0], pixel[1], pixel[2], pixel[3]], x, y);
        });
    }
}

class ArrayOfObjectsPixelStream extends BasePixelStream {
    private readonly data: PixelObject[];

    constructor(width: number, height: number) {
        super(width, height);
        this.data = Array.from({ length: width * height }, () => ({ r: 0, g: 0, b: 0, a: 0 }));
    }

    getPixel(x: number, y: number): RGBA {
        const pixel = this.data[this.getPixelIndex(x, y)];

        return [pixel.r, pixel.g, pixel.b, pixel.a];
    }

    setPixel(x: number, y: number, rgba: RGBA): RGBA {
        this.data[this.getPixelIndex(x, y)] = {
            r: rgba[0],
            g: rgba[1],
            b: rgba[2],
            a: rgba[3]
        };

        return rgba;
    }

    forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void {
        traversePixels(this.width, this.height, mode, (x, y) => {
            const pixel = this.data[y * this.width + x];

            callback([pixel.r, pixel.g, pixel.b, pixel.a], x, y);
        });
    }
}

class TypedArrayPixelStream extends BasePixelStream {
    private readonly data: Uint8Array;

    constructor(width: number, height: number) {
        super(width, height);
        this.data = new Uint8Array(width * height * 4);
    }

    getPixel(x: number, y: number): RGBA {
        const offset = this.getChannelIndex(x, y);

        return [
            this.data[offset],
            this.data[offset + 1],
            this.data[offset + 2],
            this.data[offset + 3]
        ];
    }

    setPixel(x: number, y: number, rgba: RGBA): RGBA {
        const offset = this.getChannelIndex(x, y);

        this.data[offset] = rgba[0];
        this.data[offset + 1] = rgba[1];
        this.data[offset + 2] = rgba[2];
        this.data[offset + 3] = rgba[3];

        return rgba;
    }

    forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void {
        traversePixels(this.width, this.height, mode, (x, y) => {
            const offset = (y * this.width + x) * 4;

            callback(
                [
                    this.data[offset],
                    this.data[offset + 1],
                    this.data[offset + 2],
                    this.data[offset + 3]
                ],
                x,
                y
            );
        });
    }
}

function traversePixels(
    width: number,
    height: number,
    mode: TraverseMode,
    callback: (x: number, y: number) => void
): void {
    if (mode === TraverseMode.RowMajor) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                callback(x, y);
            }
        }

        return;
    }

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            callback(x, y);
        }
    }
}

type BenchmarkCase = {
    name: string;
    create: PixelStreamFactory;
};

type BenchmarkResolution = {
    width: number;
    height: number;
};

const benchmarkCases: BenchmarkCase[] = [
    { name: 'flat-array', create: (width, height) => new FlatArrayPixelStream(width, height) },
    { name: 'array-of-arrays', create: (width, height) => new ArrayOfArraysPixelStream(width, height) },
    { name: 'array-of-objects', create: (width, height) => new ArrayOfObjectsPixelStream(width, height) },
    { name: 'typed-array', create: (width, height) => new TypedArrayPixelStream(width, height) }
];

const benchmarkResolutions: BenchmarkResolution[] = [
    { width: 256, height: 256 },
    { width: 1024, height: 1024 },
    { width: 1920, height: 1080 }
];

function makePixel(x: number, y: number): RGBA {
    return [
        (x * 13 + y * 3) % 256,
        (x * 7 + y * 11) % 256,
        (x * 5 + y * 17) % 256,
        255
    ];
}

function benchmark(label: string, fn: () => void, iterations = 3): number {
    const samples: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const startedAt = performance.now();
        fn();
        samples.push(performance.now() - startedAt);
    }

    const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    console.log(`${label}: ${avg.toFixed(2)} ms`);

    return avg;
}

function fillStream(stream: PixelStream, width: number, height: number): void {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            stream.setPixel(x, y, makePixel(x, y));
        }
    }
}

function readStream(stream: PixelStream, mode: TraverseMode): number {
    let checksum = 0;

    stream.forEach(mode, ([r, g, b, a], x, y) => {
        checksum = (checksum + r + g + b + a + x + y) % 1_000_000_007;
    });

    return checksum;
}

function runBenchmarks(): void {
    console.log('Бенчмарк PixelStream');
    console.log('');

    for (const { width, height } of benchmarkResolutions) {
        console.log(`Разрешение ${width}x${height}`);

        for (const testCase of benchmarkCases) {
            const stream = testCase.create(width, height);
            let rowMajorChecksum = 0;
            let colMajorChecksum = 0;

            benchmark(`${testCase.name} fill`, () => {
                fillStream(stream, width, height);
            });

            benchmark(`${testCase.name} read ${TraverseMode.RowMajor}`, () => {
                rowMajorChecksum = readStream(stream, TraverseMode.RowMajor);
            });

            benchmark(`${testCase.name} read ${TraverseMode.ColMajor}`, () => {
                colMajorChecksum = readStream(stream, TraverseMode.ColMajor);
            });

            console.log(
                `${testCase.name} checksum: row=${rowMajorChecksum}, col=${colMajorChecksum}`
            );
        }

        console.log('');
    }
}

runBenchmarks();
```
🔹 256×256
| Тип              |   Fill (ms) | RowMajor (ms) | ColMajor (ms) |
| ---------------- | ----------: | ------------: | ------------: |
| flat-array       | 🏆 **1.15** |          2.16 |        ❌ 1.01 |
| array-of-arrays  |        2.45 |   🏆 **1.31** |          0.87 |
| array-of-objects |      ❌ 3.52 |        ❌ 4.29 |          0.67 |
| typed-array      |        1.88 |          1.38 |   🏆 **0.59** |

🔹 1024×1024
| Тип              |    Fill (ms) | RowMajor (ms) | ColMajor (ms) |
| ---------------- | -----------: | ------------: | ------------: |
| flat-array       | 🏆 **13.34** |   🏆 **9.10** |       ❌ 24.54 |
| array-of-arrays  |      ❌ 40.52 |         10.40 |         17.35 |
| array-of-objects |        20.49 |        ❌ 9.64 |         16.41 |
| typed-array      |        14.85 |          9.35 |   🏆 **9.06** |


🔹 1920×1080
| Тип              |    Fill (ms) | RowMajor (ms) | ColMajor (ms) |
| ---------------- | -----------: | ------------: | ------------: |
| flat-array       |        30.59 |  🏆 **18.59** |         27.95 |
| array-of-arrays  |      ❌ 81.85 |         19.95 |       ❌ 34.24 |
| array-of-objects |        72.71 |       ❌ 20.77 |         28.49 |
| typed-array      | 🏆 **14.24** |         17.81 |  🏆 **19.98** |


📈 Итог сравнения
typed-array почти всегда топ по чтению. Лидер в ColMajor. Лучший fill на больших данных.
flat-array лучший fill на средних размерах. Хороший RowMajor. Сильная деградация на больших ColMajor.
array-of-arrays — нормальный RowMajor. Иногда лучше flat-array в ColMajor. Очень медленный fill.
array-of-objects — худший. Самый медленный fill. Худший RowMajor. ColMajor иногда «случайно норм».
