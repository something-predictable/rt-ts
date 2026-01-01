import {
    SyntaxKind,
    type Expression,
    type Identifier,
    type NodeFactory,
    type StringLiteral,
} from 'typescript'

export class Library {
    readonly #factory
    readonly #inferObjectMember
    #inferObjectMemberUsed = false
    readonly #isEmptyTuple
    #isEmptyTupleUsed = false

    constructor(factory: NodeFactory) {
        this.#factory = factory
        this.#inferObjectMember = factory.createIdentifier('inferObjectMember')
        this.#isEmptyTuple = factory.createIdentifier('isEmptyTuple')
    }

    inferMember(obj: Identifier, member: StringLiteral, inferrer: Expression) {
        this.#inferObjectMemberUsed = true
        return this.#factory.createCallExpression(this.#inferObjectMember, undefined, [
            obj,
            member,
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
