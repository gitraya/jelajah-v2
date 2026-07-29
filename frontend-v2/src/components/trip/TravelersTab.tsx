import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { TRIP_MEMBER_STATUSES } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { useMembers } from "@/contexts/MembersContext";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { MemberFormModal } from "@/components/modals/MemberFormModal";
import { colorFor, memberName } from "@/lib/adapters";
import { getMemberRoleColor, getMemberStatusColor } from "@/lib/colors";
import { getInitials } from "@/lib/utils";
import { AddButton, EmptyState, ItemActions } from "./ItemActions";

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
          <SelectTrigger className="w-44">
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

        <div className="flex-1" />

        {statistics?.total ? (
          <p className="text-muted-foreground" style={{ fontSize: 12 }}>
            {statistics.accepted ?? 0} accepted · {statistics.pending ?? 0} pending
            {trip?.member_spots
              ? ` · ${trip.member_spots} spots`
              : ""}
          </p>
        ) : null}

        {canEdit ? (
          <AddButton onClick={openInvite}>
            <UserPlus className="w-4 h-4" /> Invite traveler
          </AddButton>
        ) : null}
      </div>

      {filteredMembers?.length ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredMembers.map((m: any) => (
            <div
              key={m.id}
              className="group bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{
                  background: colorFor(m.user?.email || String(m.id)),
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {getInitials(memberName(m)).slice(0, 2)}
              </div>

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
