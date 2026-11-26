import type { Location } from "../types";
import styles from "./SchedulePage.module.css";

export interface Room {
  code: Location;
  /** What students call the room. */
  place: string;
  building: string;
  /** Plate color, matched by data-tone in SchedulePage.module.css. */
  tone: "le" | "ms" | "sq" | "vpa";
  mapLink: string;
}

/** The drop-in rooms, in the order the sign at the top of the page lists them. */
export const ROOMS: Room[] = [
  {
    code: "LE-237",
    place: "Campus Tutoring",
    building: "Library Building",
    tone: "le",
    mapLink:
      "https://www.google.com/maps/dir/?api=1&destination=37.301583,-121.765167",
  },
  {
    code: "MS-112",
    place: "Math & Science Resource Center",
    building: "MS3 Building",
    tone: "ms",
    mapLink:
      "https://www.google.com/maps/dir/?api=1&destination=37.300333,-121.764194",
  },
  {
    code: "SQ-231",
    place: "Biology Lab",
    building: "Sequoia Building",
    tone: "sq",
    mapLink:
      "https://www.google.com/maps/dir/?api=1&destination=37.300694,-121.761333",
  },
  {
    code: "VPA-109/111",
    place: "Music",
    building: "Visual & Performing Arts Building",
    tone: "vpa",
    mapLink:
      "https://www.google.com/maps/dir/?api=1&destination=37.300413,-121.761227",
  },
];

interface Props {
  location: Location;
}

/** A room code as a sign plate that opens directions in Google Maps. */
const LocationBadge = ({ location }: Props) => {
  const room = ROOMS.find((r) => r.code === location);
  // A room missing from ROOMS still gets a map search, in a neutral plate.
  const mapLink =
    room?.mapLink ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  const fullName = room
    ? `${room.code} ${room.place} (${room.building})`
    : location;

  return (
    <a
      href={mapLink}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.plate}
      data-tone={room?.tone}
      title={`Get directions to ${fullName}`}
    >
      {location}
    </a>
  );
};

export default LocationBadge;
