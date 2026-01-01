export function isO(u: unknown) {
    return typeof u === 'object' && u !== null
}
assert<{}>(isInferredBy(isO))

export function isT(u: unknown) {
    return Array.isArray(u) && isEmptyTuple(u)
}
assert<[]>(isInferredBy(isT))

function isEmptyTuple(xs: unknown[]): xs is [] {
    return xs.length === 0
}

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
