// Package config lê a configuração do servidor a partir de variáveis de ambiente.
package config

import (
	"os"
	"strings"
)

// Config reúne as opções do servidor; os padrões combinam com o docker-compose.
type Config struct {
	// Addr é o endereço HTTP (GUTTER_ADDR, padrão ":8080").
	Addr string
	// LibraryPaths são as raízes da biblioteca, montadas como somente leitura
	// (GUTTER_LIBRARY, separadas por vírgula; padrão "/library").
	LibraryPaths []string
	// DataDir guarda o SQLite (GUTTER_DATA, padrão "/data").
	DataDir string
	// CacheDir guarda thumbnails e CBRs extraídos; pode ser apagado (GUTTER_CACHE, padrão "/cache").
	CacheDir string
	// Dev ativa logs legíveis e CORS para o Vite (GUTTER_DEV=1).
	Dev bool
}

// FromEnv lê a configuração de GUTTER_*, com padrões para o contêiner.
func FromEnv() Config {
	return Config{
		Addr:         env("GUTTER_ADDR", ":8080"),
		LibraryPaths: splitList(env("GUTTER_LIBRARY", "/library")),
		DataDir:      env("GUTTER_DATA", "/data"),
		CacheDir:     env("GUTTER_CACHE", "/cache"),
		Dev:          env("GUTTER_DEV", "") == "1",
	}
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
