abstract class BCD {
    constructor(_num: number | bigint) {}

    abstract toBigint(): bigint;
    abstract toNumber(): number;
    abstract toString(): string;
    abstract at(index: number): number;
}

class BCD8421 extends BCD {
    private readonly packedDigits: Uint8Array;
    private readonly digitsLength: number;

    constructor(num: number | bigint) {
        super(num);

        if (typeof num === 'number') {
            if (!Number.isInteger(num) || num < 0) {
                throw new Error('BCD поддерживает только неотрицательные целые числа');
            }
        } else {
            if (num < 0n) {
                throw new Error('BCD поддерживает только неотрицательные целые числа');
            }
        }

        const sourceValue = BigInt(num);

        let tempValue = sourceValue;
        let digitsLength = 0;

        do {
            digitsLength += 1;
            tempValue /= 10n;
        } while (tempValue !== 0n);

        this.digitsLength = digitsLength;
        tempValue = sourceValue;
        this.packedDigits = new Uint8Array(Math.ceil(digitsLength / 2));

        for (let i = digitsLength - 1; i >= 0; i--) {
            this.setDigit(i, Number(tempValue % 10n));
            tempValue /= 10n;
        }
    }

    toBigint(): bigint {
        let result = 0n;

        for (let i = 0; i < this.digitsLength; i++) {
            result = result * 10n + BigInt(this.getDigit(i));
        }

        return result;
    }

    toNumber(): number {
        return Number(this.toBigint());
    }

    toString(): string {
        return this.toBigint().toString();
    }

    at(index: number): number {
        const normalizedIndex = index >= 0 ? index : this.digitsLength + index;

        if (normalizedIndex < 0 || normalizedIndex >= this.digitsLength) {
            throw new RangeError('Индекс выходит за пределы числа');
        }

        return this.getDigit(normalizedIndex);
    }

    private getDigit(index: number): number {
        const byteIndex = Math.floor(index / 2);
        const isHighNibble = index % 2 === 0;
        const byte = this.packedDigits[byteIndex];

        return isHighNibble ? byte >> 4 : byte & 0b1111;
    }

    private setDigit(index: number, digit: number): void {
        const byteIndex = Math.floor(index / 2);
        const isHighNibble = index % 2 === 0;

        if (isHighNibble) {
            this.packedDigits[byteIndex] |= digit << 4;
            return;
        }

        this.packedDigits[byteIndex] |= digit;
    }
}

const n = new BCD8421(65536);
n.toBigint(); // 65536n
// console.log(n.toNumber()); // 65536
// console.log(n.toString()); // "65536"

// console.log(n.at(0));  // 6
// console.log(n.at(1));  // 5
// console.log(n.at(-1)); // 6
// console.log(n.at(-2)); // 3
