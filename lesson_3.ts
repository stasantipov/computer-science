abstract class BCD {
    constructor(_num: number | bigint) {}

    abstract toBigint(): bigint;
    abstract toNumber(): number;
    abstract toString(): string;
    abstract at(index: number): number;
}

class BCD8421 extends BCD {
    private readonly digits: Uint8Array;

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

        if (sourceValue === 0n) {
            this.digits = new Uint8Array([0]);
            return;
        }

        let tempValue = sourceValue;
        let digitsLength: number = 0;


        while(tempValue > 0n) {
            digitsLength += 1;

            tempValue /= 10n;
        }

        tempValue = sourceValue;

        this.digits = new Uint8Array(digitsLength);

        for(let i = digitsLength - 1; i >= 0; i--) {
            this.digits[i] = Number(tempValue % 10n);
            tempValue /= 10n;
        }
    }

    toBigint(): bigint {
        let result = 0n;

        for (const digit of this.digits) {
            result = BigInt(result) * 10n + BigInt(digit);
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
        const normalizedIndex = index >= 0 ? index : this.digits.length + index;

        if (normalizedIndex < 0 || normalizedIndex >= this.digits.length) {
            throw new RangeError('Индекс выходит за пределы числа');
        }

        return this.digits[normalizedIndex];
    }
}

const n = new BCD8421(65536);

console.log(n.toBigint()); // 65536n
console.log(n.toNumber()); // 65536
console.log(n.toString()); // "65536"

console.log(n.at(0));  // 6
console.log(n.at(1));  // 5
console.log(n.at(-1)); // 6
console.log(n.at(-2)); // 3
