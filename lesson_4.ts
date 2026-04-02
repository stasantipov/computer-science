function cyclicLeftShift(bits: number, shift: number) {
    shift = shift % 32;

    return (bits << shift) | (bits >>> (32 - shift));
}

cyclicLeftShift(0b10000000_00000000_00000000_00000001, 1);

function cyclicRightShift(bits: number, shift: number) {
    shift = shift % 32;

    return (bits >>> shift) | (bits << (32 - shift));
}

cyclicRightShift(0b10000000_00000000_00000000_00000001, 2);