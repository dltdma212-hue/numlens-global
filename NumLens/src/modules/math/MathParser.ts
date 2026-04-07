import * as math from 'mathjs';

/**
 * NumLens Math Parser
 * Responsible for evaluating recognized text as mathematical expressions.
 * Follows the 'Anti-gravity' modular philosophy.
 */
export class MathParser {
  /**
   * Evaluates a string expression and returns the result.
   * @param expression The mathematical expression to evaluate (e.g., "2 + 2 * 3")
   * @returns The result as a string, or an error message if invalid.
   */
  static evaluate(expression: string): string {
    try {
      // Clean up the expression: remove spaces, handle special characters recognized by OCR
      const cleanExpression = expression
        .replace(/x/gi, '*')    // Replace 'x' or 'X' with '*'
        .replace(/÷/g, '/')     // Replace '÷' with '/'
        .replace(/[^\d+\-*/().]/g, ''); // Remove any non-math characters

      if (!cleanExpression) return "";

      const result = math.evaluate(cleanExpression);
      
      // Return formatted result
      return typeof result === 'number' 
        ? Number(result.toFixed(2)).toString() 
        : result.toString();
    } catch (error) {
      console.error("MathParser Error:", error);
      return "Error";
    }
  }
}
