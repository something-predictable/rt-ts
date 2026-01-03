/* eslint-disable no-shadow */

export function isUNS(u: unknown) {
    return typeof u === 'number' || typeof u === 'string'
}
assert<number | string>(isInferredBy(isUNS))

export const assertIsUNS = makeAssertIs(isUNSWithErrors)
assert<number | string>(isAssertedBy(assertIsUNS))

export function isUON(u: unknown) {
    return (
        (typeof u === 'object' &&
            u !== null &&
            'a' in u &&
            inferObjectMember(u, 'a', u => typeof u === 'string') &&
            'b' in u &&
            inferObjectMember(u, 'b', u => typeof u === 'number')) ||
        typeof u === 'number'
    )
}
assert<
    | {
          a: string
          b: number
      }
    | number
>(isInferredBy(isUON))

export const assertIsUON = makeAssertIs(isUONWithErrors)
assert<
    | {
          a: string
          b: number
      }
    | number
>(isAssertedBy(assertIsUON))

export function isUOO(u: unknown) {
    return (
        (typeof u === 'object' &&
            u !== null &&
            'a' in u &&
            inferObjectMember(u, 'a', u => typeof u === 'string') &&
            'b' in u &&
            inferObjectMember(u, 'b', u => typeof u === 'number')) ||
        (typeof u === 'object' &&
            u !== null &&
            'a' in u &&
            inferObjectMember(u, 'a', u => typeof u === 'string') &&
            'c' in u &&
            inferObjectMember(u, 'c', u => typeof u === 'number'))
    )
}
assert<
    | {
          a: string
          b: number
      }
    | {
          a: string
          c: number
      }
>(isInferredBy(isUOO))

export const assertIsUOO = makeAssertIs(isUOOWithErrors)
assert<
    | {
          a: string
          b: number
      }
    | {
          a: string
          c: number
      }
>(isAssertedBy(assertIsUOO))

function isUNSWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    const es: [string[], string[]] = [[], []]
    const i =
        collect(u, v => typeof v === 'number', es[0], what, 'must be a number') ||
        collect(u, v => typeof v === 'string', es[1], what, 'must be a string')
    if (!i) {
        errors.push(
            es
                .filter(branch => branch.length !== 0)
                .map(branch => branch.join(' and '))
                .join(', or '),
        )
    }
    return i
}

function isUONWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    const es: [string[], string[]] = [[], []]
    const i =
        (collect(u, v => typeof v === 'object', es[0], what, 'must be an object') &&
            collect(u, v => v !== null, es[0], what, 'must not be null') &&
            collect(u, v => 'a' in v, es[0], what, 'must contain ' + 'a') &&
            inferObjectMember(u, 'a', u =>
                collect(
                    u,
                    v => typeof v === 'string',
                    es[0],
                    memberAccess(what, 'a'),
                    'must be a string',
                ),
            ) &&
            collect(u, v => 'b' in v, es[0], what, 'must contain ' + 'b') &&
            inferObjectMember(u, 'b', u =>
                collect(
                    u,
                    v => typeof v === 'number',
                    es[0],
                    memberAccess(what, 'b'),
                    'must be a number',
                ),
            )) ||
        collect(u, v => typeof v === 'number', es[1], what, 'must be a number')
    if (!i) {
        errors.push(
            es
                .filter(branch => branch.length !== 0)
                .map(branch => branch.join(' and '))
                .join(', or '),
        )
    }
    return i
}

function isUOOWithErrors(u: unknown, what: string | undefined, errors: string[]) {
    const es: [string[], string[]] = [[], []]
    const i =
        (collect(u, v => typeof v === 'object', es[0], what, 'must be an object') &&
            collect(u, v => v !== null, es[0], what, 'must not be null') &&
            collect(u, v => 'a' in v, es[0], what, 'must contain ' + 'a') &&
            inferObjectMember(u, 'a', u =>
                collect(
                    u,
                    v => typeof v === 'string',
                    es[0],
                    memberAccess(what, 'a'),
                    'must be a string',
                ),
            ) &&
            collect(u, v => 'b' in v, es[0], what, 'must contain ' + 'b') &&
            inferObjectMember(u, 'b', u =>
                collect(
                    u,
                    v => typeof v === 'number',
                    es[0],
                    memberAccess(what, 'b'),
                    'must be a number',
                ),
            )) ||
        (collect(u, v => typeof v === 'object', es[1], what, 'must be an object') &&
            collect(u, v => v !== null, es[1], what, 'must not be null') &&
            collect(u, v => 'a' in v, es[1], what, 'must contain ' + 'a') &&
            inferObjectMember(u, 'a', u =>
                collect(
                    u,
                    v => typeof v === 'string',
                    es[1],
                    memberAccess(what, 'a'),
                    'must be a string',
                ),
            ) &&
            collect(u, v => 'c' in v, es[1], what, 'must contain ' + 'c') &&
            inferObjectMember(u, 'c', u =>
                collect(
                    u,
                    v => typeof v === 'number',
                    es[1],
                    memberAccess(what, 'c'),
                    'must be a number',
                ),
            ))
    if (!i) {
        errors.push(
            es
                .filter(branch => branch.length !== 0)
                .map(branch => branch.join(' and '))
                .join(', or '),
        )
    }
    return i
}

function inferObjectMember<
    K extends PropertyKey,
    T extends {
        [P in K]: unknown
    },
    Inferred extends T[K],
>(
    obj: T,
    key: K,
    fn: (value: T[K]) => value is Inferred,
): obj is T & {
    [P in K]: Inferred
} {
    return fn(obj[key])
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

function memberAccess(what: string | undefined, member: string) {
    if (what) {
        return `${what}.${member}`
    }
    return member
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
