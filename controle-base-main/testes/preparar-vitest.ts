import { vi } from "vitest";

// O runner Node não usa as condições React Server do Next. O build continua
// verificando a fronteira server-only de todos os imports da aplicação.
vi.mock("server-only", () => ({}));
