import HomeHeaderClient from "./HomeHeaderClient";

export default function HomeHeader({
  isAuthenticated,
}: {
  isAuthenticated?: boolean;
}) {
  return <HomeHeaderClient initialIsAuthenticated={isAuthenticated} />;
}
