const instructions = {
  'SET A': 0,
  'PRINT A': 1,
  'IFN A': 2,
  'RET': 3,
  'DEC A': 4,
  'JMP': 5
};

const program = [
  // Ставим значения аккумулятора
  instructions["SET A"],
  // В 10
  10,

  // Выводим значение на экран
  instructions["PRINT A"],

  // Если A равно 0
  instructions["IFN A"],

  // Программа завершается
  instructions["RET"],

  // И возвращает 0
  0,

  // Уменьшаем A на 1
  instructions["DEC A"],

  // Устанавливаем курсор выполняемой инструкции
  instructions["JMP"],

  // В значение 2
  2,
];

const instructionSizes = {
  [instructions['SET A']]: 2,
  [instructions['PRINT A']]: 1,
  [instructions['IFN A']]: 1,
  [instructions['RET']]: 2,
  [instructions['DEC A']]: 1,
  [instructions['JMP']]: 2
};

function getInstructionSize(program, pointer) {
    const opcode = program[pointer];

    if (opcode === undefined || instructionSizes[opcode] === undefined)  {
        throw new Error(`Неизвестная инструкция по позиции ${pointer}: ${String(opcode)}`);
    }

    return instructionSizes[opcode];
}

function readArgument(program, pointer) {
    const argument = program[pointer + 1];

    if (argument === undefined) {
        throw new Error(`Отсутствует аргумент для инструкции по позиции ${pointer}`);
    }

    return argument;
}

function execute(program) {
  let accumulator = 0;
  let pointer = 0;

  while (pointer < program.length) {
    const opcode = program[pointer];

    switch (opcode) {
      case instructions['SET A']:
        accumulator = readArgument(program, pointer);
        pointer += instructionSizes[opcode];
        break;

      case instructions['PRINT A']:
        console.log(accumulator);
        pointer += instructionSizes[opcode];
        break;

      case instructions['IFN A']:
        if (accumulator !== 0) {
          pointer += instructionSizes[opcode] + getInstructionSize(program, pointer + 1);
        } else {
          pointer += instructionSizes[opcode];
        }
        break;

      case instructions['RET']:
        return readArgument(program, pointer);

      case instructions['DEC A']:
        accumulator -= 1;
        pointer += instructionSizes[opcode];
        break;

      case instructions['JMP']:
        pointer = readArgument(program, pointer);
        break;

      default:
        throw new Error(`Неизвестная инструкция по позиции ${pointer}: ${String(opcode)}`);
    }
  }

  throw new Error('Программа завершилась без инструкции RET');
}
