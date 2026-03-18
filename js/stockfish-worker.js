// Stockfish worker shim — loads the engine via importScripts.
// This file is served locally, so new Worker('./js/stockfish-worker.js') works on file://.
// importScripts CAN load cross-origin URLs from within a Worker context.
importScripts('https://unpkg.com/stockfish.js@10.0.2/stockfish.js');
