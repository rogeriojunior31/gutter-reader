// O binário gutter é o servidor da biblioteca (API, páginas, OPDS e, na fase 2.4, o web embutido).
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rogeriojunior31/gutter-reader/server/internal/config"
	"github.com/rogeriojunior31/gutter-reader/server/internal/httpapi"
)

// version é preenchida no build: -ldflags "-X main.version=..."
var version = "dev"

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg := config.FromEnv()
	log := newLogger(cfg.Dev)
	slog.SetDefault(log)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.NewRouter(httpapi.Options{Version: version, Logger: log}),
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errc := make(chan error, 1)
	go func() {
		log.Info("gutter ouvindo", "addr", cfg.Addr, "version", version, "library", cfg.LibraryPaths)
		errc <- srv.ListenAndServe()
	}()

	select {
	case err := <-errc:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		log.Info("desligando")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}

func newLogger(dev bool) *slog.Logger {
	if dev {
		return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
	}
	return slog.New(slog.NewJSONHandler(os.Stderr, nil))
}
