abstract class BCD {
    constructor(_num: number | bigint) {}

    abstract toBigint(): bigint;
    abstract toNumber(): number;
    abstract toString(): string;
    abstract at(index: number): number;
}

const BCD8421_TABLE: Record<number, string> = {
    0: '0000',
    1: '0001',
    2: '0010',
    3: '0011',
    4: '0100',
    5: '0101',
    6: '0110',
    7: '0111',
    8: '1000',
    9: '1001',
};

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

        const decimalString = num.toString();
        this.digits = new Uint8Array(decimalString.length);

        for (let i = 0; i < decimalString.length; i += 1) {
            const digit = Number(decimalString[i]);

            if (Number.isNaN(digit) || digit < 0 || digit > 9) {
                throw new Error('Некорректная цифра в числе');
            }

            this.digits[i] = digit;
        }
    }

    toBigint(): bigint {
        let binaryString = '';

        for (const digit of this.digits) {
            binaryString += BCD8421_TABLE[digit];
        }

        return BigInt('0b' + binaryString);
    }

    toNumber(): number {
        return Number(this.toString());
    }

    toString(): string {
        let result = '';

        for (const digit of this.digits) {
            result += digit.toString();
        }

        return result;
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

console.log(n.toBigint()); // 415030n
console.log(n.toNumber()); // 65536
console.log(n.toString()); // "65536"

console.log(n.at(0));  // 6
console.log(n.at(1));  // 5
console.log(n.at(-1)); // 6
console.log(n.at(-2)); // 3