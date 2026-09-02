import type { Location } from "../types";

interface Props {
  location: Location;
}

const LocationBadge = ({ location }: Props) => {
  const getClassName = (loc: Location) => {
    switch (loc) {
      case "LE-237":
        return "location-text--library";
      case "MS-112":
        return "location-text--msrc";
      case "SQ-231":
        return "location-text--bio";
      case "VPA-109/111":
        return "location-text--music";
      default:
        return "";
    }
  };

  const getMapLink = (loc: Location) => {
    switch (loc) {
      case "LE-237":
        return "https://www.google.com/maps/dir/?api=1&destination=37.301583,-121.765167";
      case "MS-112":
        return "https://www.google.com/maps/dir/?api=1&destination=37.300333,-121.764194";
      case "SQ-231":
        return "https://www.google.com/maps/dir/?api=1&destination=37.300694,-121.761333";
      case "VPA-109/111":
        return "https://www.google.com/maps/dir/?api=1&destination=37.300413,-121.761227";
      default:
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    }
  };

  const getFullName = (loc: Location) => {
    switch (loc) {
      case "LE-237":
        return "LE-237 Campus Tutoring (Library Building)";
      case "MS-112":
        return "MS-112 Math & Science Resource Center";
      case "SQ-231":
        return "SQ-231 Biology Lab (Sequoia Building)";
      case "VPA-109/111":
        return "VPA-109/111 Music (Visual & Performing Arts Building)";
      default:
        return loc;
    }
  };

  const mapLink = getMapLink(location);
  const fullName = getFullName(location);

  return (
    <a 
      href={mapLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`schedule-item__location ${getClassName(location)}`}
      title={`Get directions to ${fullName}`}
      style={{ textDecoration: 'none', cursor: 'pointer' }}
    >
      {location}
    </a>
  );
};

export default LocationBadge;