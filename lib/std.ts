import {
    SyntaxKind,
    type Expression,
    type Identifier,
    type NodeFactory,
    type NumericLiteral,
    type StringLiteral,
} from 'typescript'

export class Library {
    readonly #factory
    readonly #inferObjectMember
    #inferObjectMemberUsed = false
    readonly #inferTupleMember
    #inferTupleMemberUsed = false
    readonly #isEmptyTuple
    #isEmptyTupleUsed = false

    constructor(factory: NodeFactory) {
        this.#factory = factory
        this.#inferObjectMember = factory.createIdentifier('inferObjectMember')
        this.#inferTupleMember = factory.createIdentifier('inferTupleMember')
        this.#isEmptyTuple = factory.createIdentifier('isEmptyTuple')
    }

    inferObjectMember(obj: Identifier, member: StringLiteral, inferrer: Expression) {
        this.#inferObjectMemberUsed = true
        return this.#factory.createCallExpression(this.#inferObjectMember, undefined, [
            obj,
            member,
            inferrer,
        ])
    }

    inferTupleMember(
        xs: Identifier,
        length: NumericLiteral,
        index: NumericLiteral,
        inferrer: Expression,
    ) {
        this.#inferTupleMemberUsed = true
        return this.#factory.createCallExpression(this.#inferTupleMember, undefined, [
            xs,
            length,
            index,
            inferrer,
        ])
    }

    isEmptyTuple(xs: Identifier) {
        this.#isEmptyTupleUsed = true
        return this.#factory.createCallExpression(this.#isEmptyTuple, undefined, [xs])
    }

    *nodes() {
        if (this.#inferObjectMemberUsed) {
            yield createInferMember(this.#factory, this.#inferObjectMember)
        }
        if (this.#inferTupleMemberUsed) {
            yield* createInferTupleMember(this.#factory, this.#inferTupleMember)
        }
        if (this.#isEmptyTupleUsed) {
            yield createEmptyTupleMember(this.#factory, this.#isEmptyTuple)
        }
    }
}

// https://ts-ast-viewer.com/

function createInferMember(factory: NodeFactory, identifier: Identifier) {
    // function inferObjectMember<
    //     K extends PropertyKey,
    //     T extends {
    //         [P in K]: unknown
    //     },
    //     Inferred extends T[K],
    // >(
    //     obj: T,
    //     key: K,
    //     fn: (value: T[K]) => value is Inferred,
    // ): obj is T & {
    //     [P in K]: Inferred
    // } {
    //     return fn(obj[key])
    // }

    const k = factory.createIdentifier('K')
    const t = factory.createIdentifier('T')
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier,
        [
            factory.createTypeParameterDeclaration(
                undefined,
                k,
                factory.createTypeReferenceNode(factory.createIdentifier('PropertyKey'), undefined),
                undefined,
            ),
            factory.createTypeParameterDeclaration(
                undefined,
                t,
                factory.createMappedTypeNode(
                    undefined,
                    factory.createTypeParameterDeclaration(
                        undefined,
                        factory.createIdentifier('P'),
                        factory.createTypeReferenceNode(k, undefined),
                        undefined,
                    ),
                    undefined,
                    undefined,
                    factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                    undefined,
                ),
                undefined,
            ),
            factory.createTypeParameterDeclaration(
                undefined,
                factory.createIdentifier('Inferred'),
                factory.createIndexedAccessTypeNode(
                    factory.createTypeReferenceNode(t, undefined),
                    factory.createTypeReferenceNode(k, undefined),
                ),
                undefined,
            ),
        ],
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('obj'),
                undefined,
                factory.createTypeReferenceNode(t, undefined),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('key'),
                undefined,
                factory.createTypeReferenceNode(k, undefined),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('fn'),
                undefined,
                factory.createFunctionTypeNode(
                    undefined,
                    [
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('value'),
                            undefined,
                            factory.createIndexedAccessTypeNode(
                                factory.createTypeReferenceNode(t, undefined),
                                factory.createTypeReferenceNode(k, undefined),
                            ),
                            undefined,
                        ),
                    ],
                    factory.createTypePredicateNode(
                        undefined,
                        factory.createIdentifier('value'),
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('Inferred'),
                            undefined,
                        ),
                    ),
                ),
                undefined,
            ),
        ],
        factory.createTypePredicateNode(
            undefined,
            factory.createIdentifier('obj'),
            factory.createIntersectionTypeNode([
                factory.createTypeReferenceNode(t, undefined),
                factory.createMappedTypeNode(
                    undefined,
                    factory.createTypeParameterDeclaration(
                        undefined,
                        factory.createIdentifier('P'),
                        factory.createTypeReferenceNode(k, undefined),
                        undefined,
                    ),
                    undefined,
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier('Inferred'),
                        undefined,
                    ),
                    undefined,
                ),
            ]),
        ),
        factory.createBlock(
            [
                factory.createReturnStatement(
                    factory.createCallExpression(factory.createIdentifier('fn'), undefined, [
                        factory.createElementAccessExpression(
                            factory.createIdentifier('obj'),
                            factory.createIdentifier('key'),
                        ),
                    ]),
                ),
            ],
            true,
        ),
    )
}

function createInferTupleMember(factory: NodeFactory, identifier: Identifier) {
    // function inferTupleMember<
    //     T extends unknown[],
    //     N extends number,
    //     I extends number,
    //     Inferred extends T[I],
    // >(xs: T, _: N, ix: I, fn: (value: T[I]) => value is Inferred): xs is T & NthTuple<Inferred, N, I> {
    //     return fn(xs[ix])
    // }

    // type NthTuple<
    //     T,
    //     N extends number,
    //     I extends number,
    //     Acc extends unknown[] = [],
    // > = Acc['length'] extends N
    //     ? Acc
    //     : Acc['length'] extends I
    //       ? NthTuple<T, N, I, [...Acc, T]>
    //       : NthTuple<T, N, I, [...Acc, unknown]>

    const t = factory.createIdentifier('T')
    const n = factory.createIdentifier('N')
    const i = factory.createIdentifier('I')
    return [
        factory.createFunctionDeclaration(
            undefined,
            undefined,
            identifier,
            [
                factory.createTypeParameterDeclaration(
                    undefined,
                    t,
                    factory.createArrayTypeNode(
                        factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                    ),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    n,
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    i,
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    factory.createIdentifier('Inferred'),
                    factory.createIndexedAccessTypeNode(
                        factory.createTypeReferenceNode(t, undefined),
                        factory.createTypeReferenceNode(i, undefined),
                    ),
                    undefined,
                ),
            ],
            [
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('xs'),
                    undefined,
                    factory.createTypeReferenceNode(t, undefined),
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('_'),
                    undefined,
                    factory.createTypeReferenceNode(n, undefined),
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('ix'),
                    undefined,
                    factory.createTypeReferenceNode(i, undefined),
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('fn'),
                    undefined,
                    factory.createFunctionTypeNode(
                        undefined,
                        [
                            factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                factory.createIdentifier('value'),
                                undefined,
                                factory.createIndexedAccessTypeNode(
                                    factory.createTypeReferenceNode(t, undefined),
                                    factory.createTypeReferenceNode(i, undefined),
                                ),
                                undefined,
                            ),
                        ],
                        factory.createTypePredicateNode(
                            undefined,
                            factory.createIdentifier('value'),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('Inferred'),
                                undefined,
                            ),
                        ),
                    ),
                    undefined,
                ),
            ],
            factory.createTypePredicateNode(
                undefined,
                factory.createIdentifier('xs'),
                factory.createIntersectionTypeNode([
                    factory.createTypeReferenceNode(t, undefined),
                    factory.createTypeReferenceNode(factory.createIdentifier('NthTuple'), [
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('Inferred'),
                            undefined,
                        ),
                        factory.createTypeReferenceNode(n, undefined),
                        factory.createTypeReferenceNode(i, undefined),
                    ]),
                ]),
            ),
            factory.createBlock(
                [
                    factory.createReturnStatement(
                        factory.createCallExpression(factory.createIdentifier('fn'), undefined, [
                            factory.createElementAccessExpression(
                                factory.createIdentifier('xs'),
                                factory.createIdentifier('ix'),
                            ),
                        ]),
                    ),
                ],
                true,
            ),
        ),
        factory.createTypeAliasDeclaration(
            undefined,
            factory.createIdentifier('NthTuple'),
            [
                factory.createTypeParameterDeclaration(undefined, t, undefined, undefined),
                factory.createTypeParameterDeclaration(
                    undefined,
                    n,
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    i,
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                    undefined,
                ),
                factory.createTypeParameterDeclaration(
                    undefined,
                    factory.createIdentifier('Acc'),
                    factory.createArrayTypeNode(
                        factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                    ),
                    factory.createTupleTypeNode([]),
                ),
            ],
            factory.createConditionalTypeNode(
                factory.createIndexedAccessTypeNode(
                    factory.createTypeReferenceNode(factory.createIdentifier('Acc'), undefined),
                    factory.createLiteralTypeNode(factory.createStringLiteral('length')),
                ),
                factory.createTypeReferenceNode(n, undefined),
                factory.createTypeReferenceNode(factory.createIdentifier('Acc'), undefined),
                factory.createConditionalTypeNode(
                    factory.createIndexedAccessTypeNode(
                        factory.createTypeReferenceNode(factory.createIdentifier('Acc'), undefined),
                        factory.createLiteralTypeNode(factory.createStringLiteral('length')),
                    ),
                    factory.createTypeReferenceNode(i, undefined),
                    factory.createTypeReferenceNode(factory.createIdentifier('NthTuple'), [
                        factory.createTypeReferenceNode(t, undefined),
                        factory.createTypeReferenceNode(n, undefined),
                        factory.createTypeReferenceNode(i, undefined),
                        factory.createTupleTypeNode([
                            factory.createRestTypeNode(
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier('Acc'),
                                    undefined,
                                ),
                            ),
                            factory.createTypeReferenceNode(t, undefined),
                        ]),
                    ]),
                    factory.createTypeReferenceNode(factory.createIdentifier('NthTuple'), [
                        factory.createTypeReferenceNode(t, undefined),
                        factory.createTypeReferenceNode(n, undefined),
                        factory.createTypeReferenceNode(i, undefined),
                        factory.createTupleTypeNode([
                            factory.createRestTypeNode(
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier('Acc'),
                                    undefined,
                                ),
                            ),
                            factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                        ]),
                    ]),
                ),
            ),
        ),
    ]
}

function createEmptyTupleMember(factory: NodeFactory, identifier: Identifier) {
    // function isEmptyTuple(xs: unknown[]): xs is [] {
    //     return xs.length === 0
    // }

    const xs = factory.createIdentifier('xs')
    return factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier,
        undefined,
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                xs,
                undefined,
                factory.createArrayTypeNode(
                    factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
                ),
                undefined,
            ),
        ],
        factory.createTypePredicateNode(undefined, xs, factory.createTupleTypeNode([])),
        factory.createBlock(
            [
                factory.createReturnStatement(
                    factory.createBinaryExpression(
                        factory.createPropertyAccessExpression(
                            xs,
                            factory.createIdentifier('length'),
                        ),
                        factory.createToken(SyntaxKind.EqualsEqualsEqualsToken),
                        factory.createNumericLiteral('0'),
                    ),
                ),
            ],
            true,
        ),
    )
}
