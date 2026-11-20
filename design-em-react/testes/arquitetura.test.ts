import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { expect, it } from "vitest";

function fontes(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    if (entrada.name === "testes") return [];
    const caminho = join(diretorio, entrada.name);
    return entrada.isDirectory() ? fontes(caminho) : /\.tsx?$/.test(caminho) ? [caminho] : [];
  });
}

it("mantém toda a apresentação sem importar Supabase ou acessar credenciais/armazenamento", () => {
  for (const caminho of fontes(fileURLToPath(new URL("..", import.meta.url)))) {
    const texto = readFileSync(caminho, "utf8");
    const fonte = ts.createSourceFile(caminho, texto, ts.ScriptTarget.Latest, true);
    function conferir(no: ts.Node) {
      if ((ts.isImportDeclaration(no) || ts.isExportDeclaration(no)) && no.moduleSpecifier && ts.isStringLiteral(no.moduleSpecifier)) {
        const somenteTipos = ts.isImportDeclaration(no) && no.importClause?.isTypeOnly;
        expect(no.moduleSpecifier.text, caminho).not.toMatch(/supabase/i);
        if (!somenteTipos) expect(no.moduleSpecifier.text, caminho).not.toMatch(/@controle\/(auth|admin)(\/|$)/i);
      }
      if (ts.isCallExpression(no) && no.arguments[0] && ts.isStringLiteral(no.arguments[0])) {
        expect(no.arguments[0].text, caminho).not.toMatch(/@supabase|@controle\/supabase/i);
      }
      if (ts.isPropertyAccessExpression(no)) {
        expect(no.getText(fonte), caminho).not.toMatch(/^(process\.env|(?:window\.)?(?:localStorage|sessionStorage))\b/);
      }
      ts.forEachChild(no, conferir);
    }
    conferir(fonte);
  }
});
