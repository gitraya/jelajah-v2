import { useState } from "react";
import { Check, MoreHorizontal, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { TRIP_MEMBER_ROLES, TRIP_MEMBER_STATUSES } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { useMembers } from "@/contexts/MembersContext";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { MemberFormModal } from "@/components/modals/MemberFormModal";
import { UserAvatar } from "@/components/UserAvatar";
import { memberName } from "@/lib/adapters";
import { getMemberRoleColor, getMemberStatusColor } from "@/lib/colors";
import { AddButton, EmptyState, ItemActions, Pill, type PillTone } from "./ItemActions";

const STATUS_TONE: Record<string, PillTone> = {
  ACCEPTED: "green",
  PENDING: "amber",
  DECLINED: "red",
};

export function TravelersTab({ trip, canEdit }: { trip: any; canEdit: boolean }) {
  const {
    filteredMembers,
    statistics,
    selectedStatus,
    setSelectedStatus,
    updateMember,
    deleteMember,
  } = useMembers();
  const { user } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const isMobile = useIsMobile();

  const openInvite = () => {
    setEditing(null);
    setFormOpen(true);
  };

  /**
   * The API rejects changing your own or the trip owner's role/status, so hide
   * those controls instead of surfacing an error the user can't act on.
   */
  const isLocked = (m: any) =>
    m.user?.id === user?.id || m.user?.id === trip?.owner?.id;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="flex-1 min-w-0 md:flex-none md:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All travelers</SelectItem>
            {Object.entries(TRIP_MEMBER_STATUSES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden md:block flex-1" />

        {statistics?.total ? (
          // Phones: its own line under the select + invite button.
          <p
            className="text-muted-foreground order-last basis-full md:order-none md:basis-auto"
            style={{ fontSize: 12 }}
          >
            {statistics.accepted ?? 0} accepted · {statistics.pending ?? 0} pending
            {trip?.member_spots
              ? ` · ${trip.member_spots} spots`
              : ""}
          </p>
        ) : null}

        {canEdit ? (
          <AddButton onClick={openInvite}>
            <UserPlus className="w-4 h-4" />
            <span>
              Invite<span className="hidden md:inline"> traveler</span>
            </span>
          </AddButton>
        ) : null}
      </div>

      {filteredMembers?.length && isMobile ? (
        <div className="space-y-2">
          {filteredMembers.map((m: any) => {
            const editable = canEdit && !isLocked(m);
            const name = memberName(m);
            const role =
              TRIP_MEMBER_ROLES[m.role as keyof typeof TRIP_MEMBER_ROLES]?.[1] || m.role;
            const status =
              TRIP_MEMBER_STATUSES[m.status as keyof typeof TRIP_MEMBER_STATUSES] ||
              m.status;
            return (
              <div
                key={m.id}
                className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-2.5 min-w-0"
              >
                <UserAvatar
                  person={m}
                  className="w-10 h-10 rounded-xl"
                  style={{ fontSize: 12, fontWeight: 800 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#16213E" }}>
                    {name}
                  </p>
                  {m.user?.email && m.user.email !== name ? (
                    <p className="text-muted-foreground truncate" style={{ fontSize: 10 }}>
                      {m.user.email}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-1 mt-1 min-w-0">
                    <Pill tone={m.role === "MEMBER" ? "muted" : "green"}>{role}</Pill>
                    <Pill tone={STATUS_TONE[m.status] || "muted"}>{status}</Pill>
                  </div>
                </div>

                {editable && m.status === "PENDING" ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Accept ${name}`}
                      onClick={() => updateMember(m.id, { status: "ACCEPTED" })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "#E6F7EE", color: "#16B364" }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Decline ${name}`}
                      onClick={() => updateMember(m.id, { status: "DECLINED" })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "#FDECEC", color: "#E5605B" }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}

                {editable ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`${name} actions`}
                        className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-muted-foreground shrink-0 active:bg-muted"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl min-w-[200px]">
                      <DropdownMenuLabel className="truncate max-w-[240px]">{name}</DropdownMenuLabel>
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(m);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" /> Manage traveler
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(m)}>
                        <Trash2 className="w-4 h-4" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            );
          })}

          {canEdit ? (
            <button
              type="button"
              onClick={openInvite}
              className="w-full bg-card border-2 border-dashed border-border rounded-xl px-3 py-2.5 flex items-center gap-2.5 active:border-primary active:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground" style={{ fontSize: 13 }}>
                Invite someone
              </span>
            </button>
          ) : null}
        </div>
      ) : filteredMembers?.length ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredMembers.map((m: any) => (
            <div
              key={m.id}
              className="group bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
            >
              <UserAvatar
                person={m}
                className="w-12 h-12 rounded-2xl"
                style={{ fontSize: 14, fontWeight: 800 }}
              />

              <div className="flex-1 min-w-0">
                <p
                  className="text-foreground truncate"
                  style={{ fontWeight: 600, fontSize: 14 }}
                >
                  {memberName(m)}
                </p>
                <p
                  className="text-muted-foreground truncate"
                  style={{ fontSize: 12 }}
                >
                  {m.user?.email}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 ${getMemberRoleColor(
                      m.role
                    )}`}
                    style={{ fontSize: 10, fontWeight: 600 }}
                  >
                    {m.role}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 ${getMemberStatusColor(
                      m.status
                    )}`}
                    style={{ fontSize: 10, fontWeight: 600 }}
                  >
                    {m.status}
                  </span>
                </div>
              </div>

              {canEdit && !isLocked(m) ? (
                <div className="flex flex-col items-end gap-1">
                  {m.status === "PENDING" ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Accept ${memberName(m)}`}
                        onClick={() => updateMember(m.id, { status: "ACCEPTED" })}
                        className="p-1.5 rounded-lg text-green-700 hover:bg-green-100 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Decline ${memberName(m)}`}
                        onClick={() => updateMember(m.id, { status: "DECLINED" })}
                        className="p-1.5 rounded-lg text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                  <ItemActions
                    label={memberName(m)}
                    onEdit={() => {
                      setEditing(m);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(m)}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          message="No travelers match this filter."
          action={
            canEdit ? (
              <AddButton onClick={openInvite}>
                <UserPlus className="w-4 h-4" /> Invite someone
              </AddButton>
            ) : undefined
          }
        />
      )}

      <MemberFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this traveler?"
        confirmLabel="Remove"
        description={`${
          deleting ? memberName(deleting) : "This traveler"
        } will lose access to the trip.`}
        onConfirm={() => deleteMember(deleting.id)}
      />
    </div>
  );
}
