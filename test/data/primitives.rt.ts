/* eslint-disable no-shadow */

export function isU(u: unknown) {
    return u === undefined
}
assert<undefined>(isInferredBy(isU))

export const assertIsU = makeAssertIs(isUWithErrors)
assert<undefined>(isAssertedBy(assertIsU))

export function isNL(u: unknown) {
    return u === null
}
assert<null>(isInferredBy(isNL))

export const assertIsNL = makeAssertIs(isNLWithErrors)
assert<null>(isAssertedBy(assertIsNL))

export function isB(u: unknown) {
    return typeof u === 'boolean'
}
assert<boolean>(isInferredBy(isB))

export const assertIsB = makeAssertIs(isBWithErrors)
assert<boolean>(isAssertedBy(assertIsB))

export function isN(u: unknown) {
    return typeof u === 'number'
}
assert<number>(isInferredBy(isN))

export const assertIsN = makeAssertIs(isNWithErrors)
assert<number>(isAssertedBy(assertIsN))

export function isS(u: unknown) {
    return typeof u === 'string'
}
assert<string>(isInferredBy(isS))

export const assertIsS = makeAssertIs(isSWithErrors)
assert<string>(isAssertedBy(assertIsS))

export function isBI(u: unknown) {
    return typeof u === 'bigint'
}
assert<bigint>(isInferredBy(isBI))

export const assertIsBI = makeAssertIs(isBIWithErrors)
assert<bigint>(isAssertedBy(assertIsBI))

function isUWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return collect(u, v => v === undefined, errors, what, 'must be undefined')
}

function isNLWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return collect(u, v => v === null, errors, what, 'must be null')
}

function isBWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return collect(u, v => typeof v === 'boolean', errors, what, 'must be a boolean')
}

function isNWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return collect(u, v => typeof v === 'number', errors, what, 'must be a number')
}

function isSWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return collect(u, v => typeof v === 'string', errors, what, 'must be a string')
}

function isBIWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    return collect(u, v => typeof v === 'bigint', errors, what, 'must be a bigint')
}

function makeAssertIs<T>(
    infer: (u: unknown, what: string | undefined, errors: string[]) => u is T,
): (u: unknown, what?: string, error?: (issues: string[]) => Error) => asserts u is T {
    return (u: unknown, what: string | undefined, error?: (issues: string[]) => Error) => {
        const issues: string[] = []
        if (!infer(u, what, issues)) {
            if (error) {
                throw error(issues)
            }
            const [first] = issues
            if (!first) {
                throw new Error('runtime type check')
            }
            throw Object.assign(new TypeError(first), { issues })
        }
    }
}

function collect<I, T extends I>(
    u: I,
    infer: (u: I) => u is T,
    errors: string[],
    what: string | undefined,
    error: string,
) {
    const i = infer(u)
    if (!i) {
        if (what) {
            errors.push(`${what} ${error}`)
        } else {
            errors.push(error)
        }
    }
    return i
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

function isAssertedBy<T>(
    _: (u: unknown, what: string | undefined, error: (issues: string[]) => Error) => asserts u is T,
) {
    return {
        i: (__: T) => {
            //
        },
        o: () => undefined as T,
    }
}
