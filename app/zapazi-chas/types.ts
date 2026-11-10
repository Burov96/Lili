export type BookingField = "name" | "patientName" | "phone" | "consent" | "slot";

export type BookingValues = {
  name: string;
  forOther: boolean;
  patientName: string;
  phone: string;
  note: string;
};

export type BookingState =
  | { status: "idle"; attempt: number }
  | {
      status: "error";
      attempt: number;
      message: string;
      errors: Partial<Record<BookingField, string>>;
      values: BookingValues;
    }
  | {
      status: "success";
      attempt: number;
      /** „YYYY-MM-DD|15“ */
      slot: string;
      when: string;
      who: string;
      phone: string;
    };

export const initialBookingState: BookingState = { status: "idle", attempt: 0 };
