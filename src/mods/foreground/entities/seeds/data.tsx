import { Seed } from "@/mods/background/service_worker/entities/seeds/data";
import { useQuery } from "@hazae41/glacier";
import { Optional } from "@hazae41/option";
import { useSubscribe } from "../../storage/storage";
import { useUserStorage } from "../../storage/user";

export function useSeed(uuid: Optional<string>) {
  const storage = useUserStorage().unwrap()
  const query = useQuery(Seed.Foreground.schema, [uuid, storage])
  useSubscribe(query as any, storage)
  return query
}