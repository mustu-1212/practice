import { useState } from "react";
import { CreateUserModal } from "../CreateUserModal";
import { Button } from "@/components/ui/button";

const mockManagers = [
  { id: "1", name: "John Smith" },
  { id: "2", name: "Sarah Johnson" },
];

export default function CreateUserModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <CreateUserModal
        open={open}
        onOpenChange={setOpen}
        onSubmit={(data) => console.log("User created:", data)}
        managers={mockManagers}
      />
    </div>
  );
}
