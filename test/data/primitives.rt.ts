export function isB(u: unknown) {
    return typeof u === 'boolean'
}
assert<boolean>(isInferredBy(isB))

export function isN(u: unknown) {
    return typeof u === 'number'
}
assert<number>(isInferredBy(isN))

export function isS(u: unknown) {
    return typeof u === 'string'
}
assert<string>(isInferredBy(isS))

export function isBI(u: unknown) {
    return typeof u === 'bigint'
}
assert<bigint>(isInferredBy(isBI))

function assert<T>({ i, o }: { i: (_: T) => void; o: () => T }) {
    i(o())
}

function isInferredBy<T>(_: (u: unknown) => u is T) {
    return {
        i: (__: T) => {
            //
        },
        o: () => undefined as T,
    }
}
