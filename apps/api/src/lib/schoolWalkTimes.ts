/**
 * Walking times to the nearby schools, routed on the footpath network (D-100).
 *
 * The tenant report printed "~14 min walk" from the straight-line distance at
 * a fixed pace — a formula shown as a measurement, the same class as the
 * amenity times fixed in D-096. Up to nine schools (three per level), routed
 * in parallel; a school the router cannot reach keeps `walkMin: null` and
 * the report falls back to the labelled estimate.
 */

import type { SchoolsResult, NearbySchool } from '../types/analysis'
import { routeMinutes } from '../services/mapboxService'

export async function withSchoolWalkTimes(
  schools: SchoolsResult,
  from: { lat: number; lng: number }
): Promise<SchoolsResult> {
  const route = async (s: NearbySchool): Promise<NearbySchool> => {
    if (s.lat == null || s.lng == null) return { ...s, walkMin: null }
    const walkMin = await routeMinutes('walking', from, { lat: s.lat, lng: s.lng })
    return { ...s, walkMin }
  }
  const [elementary, middle, high] = await Promise.all([
    Promise.all(schools.elementary.map(route)),
    Promise.all(schools.middle.map(route)),
    Promise.all(schools.high.map(route)),
  ])
  return { ...schools, elementary, middle, high }
}
