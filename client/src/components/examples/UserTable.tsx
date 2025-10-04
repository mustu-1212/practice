import { UserTable } from "../UserTable";

const mockUsers = [
  { id: "1", name: "John Smith", email: "john@company.com", role: "ADMIN" as const },
  { id: "2", name: "Sarah Johnson", email: "sarah@company.com", role: "MANAGER" as const, managerName: "John Smith" },
  { id: "3", name: "Mike Davis", email: "mike@company.com", role: "EMPLOYEE" as const, managerName: "Sarah Johnson" },
];

export default function UserTableExample() {
  return (
    <div className="p-4">
      <UserTable 
        users={mockUsers}
        onEdit={(user) => console.log("Edit:", user)}
        onDelete={(id) => console.log("Delete:", id)}
      />
    </div>
  );
}
