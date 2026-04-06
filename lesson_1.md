Вариант 1. Описание: символы разбил по частоте использования. Самые часто используемые получают наименьшее количество бит, а редко используемые наибольшее. В 5 бит поместились редко используемые буквы, смена регистра, цифры, знаки препинания, управляющие символы. Чтобы избежать ошибок при декодировании, к каждому символу добавляется префикс в соответствии с таблицей префиксов. 
  
  
  ## 1. Префиксы длины

  | Количество бит | Префикс |
  | ----- | ----- |
  | 2 бита | 00 |
  | 3 бита | 01 |
  | 4 бита | 10 |
  | 5 бит | 110 |

  ### 2 бита

  | Символ | Код |
  | ----- | ----- |
  | пробел | 00 00 |
  | о | 00 01 |
  | е | 00 10 |
  | а | 00 11 |

  ### 3 бита

  | Символ | Код |
  | ----- | ----- |
  | и | 01 000 |
  | н | 01 001 |
  | т | 01 010 |
  | с | 01 011 |
  | р | 01 100 |
  | в | 01 101 |
  | л | 01 110 |
  | к | 01 111 |

  ### 4 бита

  | Символ | Код |
  | ----- | ----- |
  | м | 10 0000 |
  | д | 10 0001 |
  | п | 10 0010 |
  | у | 10 0011 |
  | я | 10 0100 |
  | ы | 10 0101 |
  | ь | 10 0110 |
  | г | 10 0111 |
  | з | 10 1000 |
  | б | 10 1001 |
  | ч | 10 1010 |
  | й | 10 1011 |
  | х | 10 1100 |
  | ж | 10 1101 |
  | ш | 10 1110 |
  | ю | 10 1111 |

  ### 5 бит

  | Символ | Код |
  | ----- | ----- |
  | ц | 110 00000 |
  | щ | 110 00001 |
  | э | 110 00010 |
  | ф | 110 00011 |
  | ё | 110 00100 |
  | ъ | 110 00101 |

  ## Регистр

  | Обозначение | Код |
  | ----- | ----- |
  | CAP | 110 00110 |

  ## Цифры

  | Символ | Код | Символ | Код |
  | ----- | ----- | ----- | ----- |
  | 0 | 110 00111 | 5 | 110 01100 |
  | 1 | 110 01000 | 6 | 110 01101 |
  | 2 | 110 01001 | 7 | 110 01110 |
  | 3 | 110 01010 | 8 | 110 01111 |
  | 4 | 110 01011 | 9 | 110 10000 |

  ## Знаки препинания

  | Символ | Код | Символ | Код |
  | ----- | ----- | ----- | ----- |
  | . | 110 10001 | - | 110 10111 |
  | , | 110 10010 | ( | 110 11000 |
  | ! | 110 10011 | ) | 110 11001 |
  | ? | 110 10100 | " | 110 11010 |

  ## Управляющие символы

  | Символ | Код |
  | ----- | ----- |
  | табуляция | 110 11101 |
  | перевод строки | 110 11110 |

const encoding: Record<string, string> = {
  ' ': '0000',
  'о': '0001',
  'е': '0010',
  'а': '0011',

  'и': '01000',
  'н': '01001',
  'т': '01010',
  'с': '01011',
  'р': '01100',
  'в': '01101',
  'л': '01110',
  'к': '01111',

  'м': '100000',
  'д': '100001',
  'п': '100010',
  'у': '100011',
  'я': '100100',
  'ы': '100101',
  'ь': '100110',
  'г': '100111',
  'з': '101000',
  'б': '101001',
  'ч': '101010',
  'й': '101011',
  'х': '101100',
  'ж': '101101',
  'ш': '101110',
  'ю': '101111',

  'ц': '11000000',
  'щ': '11000001',
  'э': '11000010',
  'ф': '11000011',
  'ё': '11000100',
  'ъ': '11000101',
  'CAP': '11000110',
  '0': '11000111',
  '1': '11001000',
  '2': '11001001',
  '3': '11001010',
  '4': '11001011',
  '5': '11001100',
  '6': '11001101',
  '7': '11001110',
  '8': '11001111',
  '9': '11010000',
  '.': '11010001',
  ',': '11010010',
  '!': '11010011',
  '?': '11010100',
  '-': '11010111',
  '(': '11011000',
  ')': '11011001',
  '"': '11011010',
  '\t': '11011101',
  '\n': '11011110'
};

const reverseEncoding = Object.fromEntries(
  Object.entries(encoding).map(([char, bits]) => [bits, char])
) as Record<string, string>;

function isUpperCase(char: string) {
  return char === char.toUpperCase() && char !== char.toLowerCase();
}

function getCodeLength(bits: string, index: number): number {
  const prefix2 = bits.slice(index, index + 2);

  if (prefix2 === '00' || prefix2 === '01' || prefix2 === '10') {
    return prefix2 === '00' ? 4 : prefix2 === '01' ? 5 : 6;
  }

  if (bits.slice(index, index + 3) === '110') {
    return 8;
  }

  throw new Error(`Некорректный префикс в позиции ${index}`);
}

const MyEncoding = {
  encode(str: string): Uint8Array {
    let bitStream = '';

    for (const char of str) {
      if (isUpperCase(char)) {
        const lowerCharBits = encoding[char.toLowerCase()];

        if (!lowerCharBits) {
          throw new Error(`Символ "${char}" не поддерживается кодировкой`);
        }

        bitStream += encoding.CAP + lowerCharBits;
        continue;
      }

      const bits = encoding[char];

      if (!bits) {
        throw new Error(`Символ "${char}" не поддерживается кодировкой`);
      }

      bitStream += bits;
    }

    const bitLength = bitStream.length;
    const paddedBitStream = bitStream.padEnd(Math.ceil(bitLength / 8) * 8, '0');
    const bytes = new Uint8Array(4 + paddedBitStream.length / 8);
    const view = new DataView(bytes.buffer);

    view.setUint32(0, bitLength);

    for (let i = 0; i < paddedBitStream.length; i += 8) {
      bytes[4 + i / 8] = parseInt(paddedBitStream.slice(i, i + 8), 2);
    }

    return bytes;
  },

  decode(bytes: Uint8Array): string {
    if (bytes.length < 4) {
      throw new Error('Поток байтов слишком короткий');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const bitLength = view.getUint32(0);
    let bitStream = '';

    for (let i = 4; i < bytes.length; i++) {
      bitStream += bytes[i].toString(2).padStart(8, '0');
    }

    bitStream = bitStream.slice(0, bitLength);

    let result = '';
    let shouldUppercaseNext = false;
    let index = 0;

    while (index < bitStream.length) {
      const codeLength = getCodeLength(bitStream, index);
      const code = bitStream.slice(index, index + codeLength);
      const decodedChar = reverseEncoding[code];

      if (!decodedChar) {
        throw new Error(`Неизвестный код "${code}"`);
      }

      if (decodedChar === 'CAP') {
        shouldUppercaseNext = true;
        index += codeLength;
        continue;
      }

      result += shouldUppercaseNext ? decodedChar.toUpperCase() : decodedChar;
      shouldUppercaseNext = false;
      index += codeLength;
    }

    if (shouldUppercaseNext) {
      throw new Error('Поток битов оканчивается служебным кодом CAP');
    }

    return result;
  }
};

const bytes = MyEncoding.encode('Какая-то строка!');
console.log(bytes); // Uint8Array
console.log(MyEncoding.decode(bytes)); // "Какая-то строка!"
