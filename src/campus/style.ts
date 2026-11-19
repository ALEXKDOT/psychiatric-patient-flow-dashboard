import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl'
import type { CampusPack } from '../cartography/campusPacks'
import { terrainSource } from '../cartography/terrain'
import { shoreline } from '../cartography/base'
import { roofRim } from './geometry'

export function campusStyle(pack: CampusPack, dark: boolean): StyleSpecification {
  const h = pack.target.display_height_m ?? 0
  const known: ExpressionSpecification = ['>', ['coalesce', ['get', 'display_height_m'], 0], 0]
  const color: ExpressionSpecification = [
    'case',
    ['get', 'is_target'],
    dark ? '#d4804c' : '#e5a270',
    dark ? '#85938e' : '#f8f9f2',
  ]
  const selected: ExpressionSpecification = ['==', ['get', 'is_target'], true]
  return {
    version: 8,
    light: {
      anchor: 'map',
      position: [1.45, 220, 38],
      color: dark ? '#e4e8ed' : '#fffcf0',
      intensity: dark ? 0.49 : 0.43,
    },
    sources: {
      dem: terrainSource(pack.target.campus_id),
      water: { type: 'geojson', data: shoreline },
      streets: { type: 'geojson', data: pack.streets, tolerance: 0.2, maxzoom: 18 },
      buildings: { type: 'geojson', data: pack.buildings, tolerance: 0.14, maxzoom: 18 },
      rim: { type: 'geojson', data: roofRim(pack), maxzoom: 18, tolerance: 0.01 },
    },
    layers: [
      {
        id: 'ground',
        type: 'background',
        paint: { 'background-color': dark ? '#303938' : '#dce0d5' },
      },
      {
        id: 'relief',
        type: 'hillshade',
        source: 'dem',
        paint: {
          'hillshade-exaggeration': 0.24,
          'hillshade-shadow-color': dark ? '#0f1716' : '#8a9588',
          'hillshade-highlight-color': dark ? '#62736a' : '#ffffff',
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'water',
        filter: ['==', ['get', 'kind'], 'water'],
        paint: { 'fill-color': dark ? '#16272b' : '#c1d6d9' },
      },
      {
        id: 'shore',
        type: 'line',
        source: 'water',
        filter: ['==', ['get', 'kind'], 'shore'],
        paint: { 'line-color': dark ? '#718582' : '#a4bab9', 'line-width': 1.1 },
      },
      {
        id: 'curbs',
        type: 'line',
        source: 'streets',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-width': ['interpolate', ['exponential', 2], ['zoom'], 15, 3, 17, 12, 19, 47],
          'line-color': dark ? '#606c69' : '#bcc4b9',
        },
      },
      {
        id: 'streets',
        type: 'line',
        source: 'streets',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-width': ['interpolate', ['exponential', 2], ['zoom'], 15, 2, 17, 10, 19, 42],
          'line-color': dark ? '#46524f' : '#f6f7ef',
        },
      },
      {
        id: 'plans',
        type: 'fill',
        source: 'buildings',
        // A positive-height building already has an opaque roof and walls.
        // Reserve the ground-level plate for footprints without a usable height.
        filter: ['!', known],
        paint: {
          'fill-color': ['case', selected, '#d67741', dark ? '#697470' : '#c7cdc3'],
          'fill-outline-color': dark ? '#323c3b' : '#acb5a9',
        },
      },
      {
        id: 'massing',
        type: 'fill-extrusion',
        source: 'buildings',
        filter: known,
        paint: {
          'fill-extrusion-color': color,
          'fill-extrusion-height': ['get', 'display_height_m'],
          'fill-extrusion-base': 0,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'selected-roof-line',
        type: 'fill-extrusion',
        source: 'rim',
        paint: {
          'fill-extrusion-color': dark ? '#ffb778' : '#c76030',
          'fill-extrusion-base': h + 0.12,
          'fill-extrusion-height': h + 0.65,
          'fill-extrusion-vertical-gradient': false,
        },
      },
    ],
  }
}
