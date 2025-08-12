import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createZone, updateZone, getZone } from "../api/zone";
import { getWarehouses } from "../api/warehouse";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ZoneForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  const [warehouses, setWarehouses] = useState([]);

  // Load list when admin
  useEffect(() => {
    if (user?.role === "ADMIN") {
      getWarehouses().then(setWarehouses).catch(console.error);
    }
  }, [user]);

  // Preload for edit / default for non-admin
  useEffect(() => {
    if (isEdit) {
      getZone(Number(id)).then((z) => {
        setValue("name", z.name);
        setValue("description", z.description || "");
        setValue("warehouseId", z.warehouseId);
      });
    } else if (user && user.role !== "ADMIN") {
      setValue("warehouseId", user.warehouseId);
    }
  }, [id, isEdit, user, setValue]);

  async function onSubmit(data) {
    try {
      if (isEdit) await updateZone(Number(id), data);
      else await createZone(data);
      navigate("/zones");
    } catch (e) {
      console.error("Failed to save zone", e);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h1 className="text-xl font-semibold">{isEdit ? "Edit Zone" : "New Zone"}</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
          <Field
            label="Name"
            error={errors.name?.message}
            input={
              <input
                {...register("name", { required: "Required" })}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            }
          />

          <Field
            label="Description"
            input={
              <textarea
                {...register("description")}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            }
          />

          {user?.role === "ADMIN" ? (
            <Field
              label="Warehouse"
              error={errors.warehouseId?.message | undefined}
              input={
                <select
                  {...register("warehouseId", { required: "Required", valueAsNumber: true })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              }
            />
          ) : (
            <input type="hidden" {...register("warehouseId", { valueAsNumber: true })} />
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/zones")}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60 hover:enabled:bg-blue-700"
            >
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  input,
  error,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <div className="mt-1">{input}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
