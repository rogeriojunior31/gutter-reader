/** Imports de asset resolvidos pelo Vite (ex.: o .wasm do unrar). */
declare module '*?url' {
  const url: string;
  export default url;
}
