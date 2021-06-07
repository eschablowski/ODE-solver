import { MathNode, derivative as _derive, simplify, parse } from 'mathjs';
import dotenv from "dotenv";
dotenv.config();
import WolframAlpha from "wolfram-alpha-api";

export const wolfram = new WolframAlpha(process.env.WOLFRAM_ID); // Create a new Wolfram Alpha API instance woth the correct key

function includes(arr: MathNode[], func: MathNode) {
    for (const foundFunc of arr) {
        if (foundFunc.equals(func)) return true;
    }
    return false;
}

export function derivatives(
    f: MathNode,
    independentVariable: string
): MathNode[] {
    let derivatives: MathNode[] = [];
    let func = f;
    do {
        derivatives.push(func);
        func = _derive(func, independentVariable, {
            simplify: true,
        });
    } while (!includes(derivatives, func));
    return derivatives;
}

export function derive(
    f: MathNode,
    degree: number,
    independentVariable: string
) {
    if (degree === 0) return f;
    return _derive(
        derive(f, degree - 1, independentVariable),
        independentVariable,
        {
            simplify: true,
        }
    );
}

export function equal(a: MathNode, b: MathNode) {}
export function isConstant(node: MathNode) {
    if (node.isConstantNode) return true;
    if ((node.isFunctionNode || node.isOperatorNode) && 'args' in node) {
        for (const n of node.args) {
            if (!isConstant(n)) return false;
        }
        return true;
    }
    return false;
}

/**
 * Puts a mathematical function in its most expanded form
 * @param func The function to be expanded
 * @returns The expanded function
 */
export function expand(func: MathNode) {
    return simplify(func, [
        'log(e) -> 1',
        '1 * n1 -> n1',
        '0 + n1 -> n1',
        'n1^ (n2 + n3) -> n1 ^ n2 * n1 ^ n3',
        'n1 ^ 0 -> 1',
        'n1 ^ 1 -> n1',
        '(n1+n2)*n3 -> n1*n3 + n2*n3',
        'c1 * n1+ c2 * n1 -> (c1+c2) * n1',
        (simplify as any).rules.filter((r) => typeof r === 'function')[1], // simplifies constants
    ]);
}
