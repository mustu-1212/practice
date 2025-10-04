import { UserAvatar } from "../UserAvatar";

export default function UserAvatarExample() {
  return (
    <div className="flex gap-4 p-4">
      <UserAvatar name="John Smith" />
      <UserAvatar name="Sarah Johnson" />
      <UserAvatar name="Mike Davis" />
    </div>
  );
}
