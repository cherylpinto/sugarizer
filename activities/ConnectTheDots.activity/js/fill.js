// fill.js — Polygon detection + per-region fill
// When a line completes a cycle, detect the polygon and fill it.
// Each region keeps its own color; new fills don't overwrite old ones.

define([], function () {
	"use strict";

	/**
	 * BFS shortest path from startDot to endDot through existing graph.
	 * Returns array of dots forming the path, or null if no path.
	 */
	function findShortestPath(lineManager, startDot, endDot) {
		var endKey = endDot.row + "," + endDot.col;
		var startKey = startDot.row + "," + startDot.col;
		if (startKey === endKey) return null;

		var visited = {};
		visited[startKey] = true;
		var queue = [{ dot: startDot, path: [startDot] }];

		while (queue.length > 0) {
			var item = queue.shift();
			var neighbors = lineManager.getNeighbors(item.dot);

			for (var i = 0; i < neighbors.length; i++) {
				var next = neighbors[i];
				var nk = next.row + "," + next.col;

				if (nk === endKey) {
					return item.path.concat([next]);
				}
				if (!visited[nk]) {
					visited[nk] = true;
					queue.push({ dot: next, path: item.path.concat([next]) });
				}
			}
		}
		return null;
	}

	/**
	 * Ray-casting point-in-polygon test.
	 */
	function pointInPolygon(px, py, polygon) {
		var inside = false;
		var n = polygon.length;
		for (var i = 0, j = n - 1; i < n; j = i++) {
			var xi = polygon[i].x, yi = polygon[i].y;
			var xj = polygon[j].x, yj = polygon[j].y;
			if (((yi > py) !== (yj > py)) &&
				(px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
				inside = !inside;
			}
		}
		return inside;
	}

	/**
	 * Find cells inside a polygon and update the color map.
	 * Only fills cells that don't already have a color (preserves old fills).
	 *
	 * @param {Array} polygon - Array of {x, y} vertices
	 * @param {object} grid - Grid from grid.js
	 * @param {Array} colorMap - 2D array [row][col] of colors or null
	 * @param {string} color - Fill color for new cells
	 */
	function fillPolygonCells(polygon, grid, colorMap, color) {
		var cellRows = grid.rows - 1;
		var cellCols = grid.cols - 1;
		var filled = 0;

		for (var r = 0; r < cellRows; r++) {
			for (var c = 0; c < cellCols; c++) {
				// Cell center
				var cx = grid.offsetX + c * grid.spacing + grid.spacing / 2;
				var cy = grid.offsetY + r * grid.spacing + grid.spacing / 2;

				if (pointInPolygon(cx, cy, polygon)) {
					if (!colorMap[r][c]) {
						colorMap[r][c] = color;
						filled++;
					}
				}
			}
		}
		return filled;
	}

	/**
	 * Create an empty color map.
	 */
	function createColorMap(rows, cols) {
		var map = [];
		for (var r = 0; r < rows - 1; r++) {
			map[r] = [];
			for (var c = 0; c < cols - 1; c++) {
				map[r][c] = null;
			}
		}
		return map;
	}

	return {
		findShortestPath: findShortestPath,
		pointInPolygon: pointInPolygon,
		fillPolygonCells: fillPolygonCells,
		createColorMap: createColorMap
	};
});
