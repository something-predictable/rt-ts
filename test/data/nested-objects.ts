export type S = {
    type: 'up' | 'down'
    n: string
    a: {
        x: number
        y: number
    }
    b: {
        [k: string]: 1 | 3
    }
}

export type TOS = [
    {
        a: number
        b: {
            n: string
        }
    },
    string,
]
