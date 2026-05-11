## 1. Без указателей
```ts
class BinaryStringCodec {
    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    private buffer!: ArrayBuffer;
    private view!: DataView;

    constructor(strings: string[]) {
        this.encodeStrings(strings);
    }

    private encodeStrings(strings: string[]) {
        const encodedStrings = strings.map((str) => this.encoder.encode(str));

        let totalSize = 4;

        encodedStrings.forEach((bytes) => {
            totalSize += 4;
            totalSize += bytes.length
        });

        this.buffer = new ArrayBuffer(totalSize);
        this.view = new DataView(this.buffer);

        let offset = 0;

        // Количество строк
        this.view.setUint32(offset, strings.length, true)

        offset += 4;

        encodedStrings.forEach((bytes) => {
            // Длина
            this.view.setUint32(offset, bytes.length, true);

            offset += 4;

            // Символы
            new Uint8Array(this.buffer, offset, bytes.length).set(bytes);

            offset += bytes.length;
        });
    }

    decodeStrings() {
        const strings = [];

        let offset = 4;

        const stringsLength = this.view.getUint32(0, true);

        for (let i = 0; i < stringsLength; i++) {
            const stringLength = this.view.getUint32(offset, true);

            offset += 4;

            const partView = new DataView(this.buffer, offset, stringLength);

            const decodedString = this.decoder.decode(partView);

            strings.push(decodedString);

            offset += stringLength;
        }

        return strings;
    }

    at(at: number) {
        const stringsLength = this.view.getUint32(0, true);

        if (at < 0) at = stringsLength + at;
        
        if (at < 0 || at >= stringsLength) {
            return undefined;
        }

        let offset = 4;

        for (let i = 0; i < stringsLength; i++) {
            const stringLength = this.view.getUint32(offset, true);

            offset += 4;

            if (i === at) {
                const bytes = new Uint8Array(this.buffer, offset, stringLength);

                return this.decoder.decode(bytes);
            }

            offset += stringLength;
        }
    }
}

const binaryStrings = new BinaryStringCodec(['Bob', 'Привет', '']);

console.log(binaryStrings.decodeStrings()); // [ 'Bob', 'Привет', '' ]

console.log(binaryStrings.at(1)); // 'Привет'
console.log(binaryStrings.at(-3)); // 'Bob'
```

## 2. С указателями
```ts
class BinaryStringCodecWithPointer {
    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    private buffer!: ArrayBuffer;
    private view!: DataView;

    constructor(strings: string[]) {
        this.encodeStrings(strings);
    }

    private encodeStrings(strings: string[]) {
        const encodedStrings = strings.map((str) => this.encoder.encode(str));

        let totalSize = 4 + strings.length * 8;

        encodedStrings.forEach((bytes) => {
            totalSize += bytes.length;
        });

        this.buffer = new ArrayBuffer(totalSize);
        this.view = new DataView(this.buffer);

        // Количество строк
        this.view.setUint32(0, strings.length, true);

        // Где пишем таблицу [длина, указатель]
        let tableOffset = 4;

        // Где начинаются реальные байты строк
        let dataOffset = 4 + strings.length * 8;

        encodedStrings.forEach((bytes) => {
            // Длина строки
            this.view.setUint32(tableOffset, bytes.length, true);

            // Указатель, где строка начинается в buffer
            this.view.setUint32(tableOffset + 4, dataOffset, true);

            // Символы
            new Uint8Array(this.buffer, dataOffset, bytes.length).set(bytes);

            tableOffset += 8;

            dataOffset += bytes.length;
        });
    }

    decodeStrings() {
        const strings = [];

        const stringsLength = this.view.getUint32(0, true);

        let tableOffset = 4;

        for (let i = 0; i < stringsLength; i++) {
            const stringLength = this.view.getUint32(tableOffset, true);

            tableOffset += 4;

            const stringOffset = this.view.getUint32(tableOffset, true);

            tableOffset += 4;

            const partView = new DataView(this.buffer, stringOffset, stringLength);

            const decodedString = this.decoder.decode(partView);

            strings.push(decodedString);
        }

        return strings;
    }

    at(index: number): string | undefined {
        const stringsLength = this.view.getUint32(0, true);

        if (index < 0) {
            index = stringsLength + index;
        }

        if (index < 0 || index >= stringsLength) {
            return undefined;
        }

        const recordOffset = 4 + index * 8;

        const stringLength = this.view.getUint32(recordOffset, true);

        const stringOffset = this.view.getUint32(recordOffset + 4, true);

        const bytes = new Uint8Array(this.buffer, stringOffset, stringLength);

        return this.decoder.decode(bytes);
    }
}

const binaryStringsWithPointer = new BinaryStringCodecWithPointer(['Bob', 'Привет', '']);

console.log(binaryStringsWithPointer.decodeStrings()); // [ 'Bob', 'Привет', '' ]
console.log(binaryStringsWithPointer.at(1)); // 'Привет'
console.log(binaryStringsWithPointer.at(-3)); // 'Bob'
```

## 3. Бэнчмарк
```ts
const strings = Array.from({ length: 100_000 }, (_, i) => `String ${i}`);

const codec1 = new BinaryStringCodec(strings);
const codec2 = new BinaryStringCodecWithPointer(strings);

const iterations = 100_000;

let start = performance.now();

for (let i = 0; i < iterations; i++) {
    codec1.at(strings.length - 1);
}

let end = performance.now();

console.log('Без указателей:', ((end - start) / 1000).toFixed(3), 'сек');

start = performance.now();

for (let i = 0; i < iterations; i++) {
    codec2.at(strings.length - 1);
}

end = performance.now();

console.log('С указателями:', ((end - start) / 1000).toFixed(3), 'сек');
```

## 4. Эффективность операции at в обеих реализациях на 100_000 итераций

Без указателей: 22.649 сек
С указателями: 0.008 сек