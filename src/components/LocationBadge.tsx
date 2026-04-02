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
      default:
        return "";
    }
  };

  return (
    <span className={`schedule-item__location ${getClassName(location)}`}>
      {location}
    </span>
  );
};

export default LocationBadge;