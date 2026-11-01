/**
 * Lista central de entidades. Tanto o DataSource da aplicacao quanto o
 * CLI de migrations importam esta mesma lista, para nunca ficarem
 * dessincronizados. Comeca vazia - cada modulo de dominio adiciona sua
 * propria entidade aqui conforme e criado.
 */
export const ENTITIES: Function[] = [];
