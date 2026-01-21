"use server";

import { getSupabaseAdmin } from "./supabase";
import type {
  EventWithDetails,
  Customer,
  CustomerInsert,
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  Ticket,
  TicketInsert,
  Performer,
  Venue,
} from "./types";

// ============================================
// EVENT QUERIES
// ============================================

/**
 * Get all published events with details
 */
export const getPublishedEvents = async (): Promise<EventWithDetails[]> => {
  const supabase = getSupabaseAdmin();

  // Get events with venue
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(
      `
      *,
      venue:venues(*)
    `
    )
    .eq("status", "published")
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date", { ascending: true });

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
    throw eventsError;
  }

  if (!events || events.length === 0) {
    return [];
  }

  // Get performers for all events
  const eventIds = events.map((e) => e.id);
  const { data: eventPerformers, error: performersError } = await supabase
    .from("event_performers")
    .select(
      `
      event_id,
      performer:performers(*)
    `
    )
    .in("event_id", eventIds)
    .order("performance_order", { ascending: true });

  if (performersError) {
    console.error("Error fetching performers:", performersError);
    throw performersError;
  }

  // Map performers to events
  const eventsWithDetails: EventWithDetails[] = events.map((event) => {
    const performers =
      eventPerformers
        ?.filter((ep) => ep.event_id === event.id)
        .map((ep) => ep.performer as unknown as Performer)
        .filter(Boolean) ?? [];

    return {
      ...event,
      venue: event.venue as Venue | null,
      performers,
    };
  });

  return eventsWithDetails;
};

/**
 * Get a single event by ID with details
 */
export const getEventById = async (
  eventId: string
): Promise<EventWithDetails | null> => {
  const supabase = getSupabaseAdmin();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      `
      *,
      venue:venues(*)
    `
    )
    .eq("id", eventId)
    .single();

  if (eventError) {
    if (eventError.code === "PGRST116") {
      return null; // Not found
    }
    console.error("Error fetching event:", eventError);
    throw eventError;
  }

  // Get performers
  const { data: eventPerformers, error: performersError } = await supabase
    .from("event_performers")
    .select(
      `
      performer:performers(*)
    `
    )
    .eq("event_id", eventId)
    .order("performance_order", { ascending: true });

  if (performersError) {
    console.error("Error fetching performers:", performersError);
    throw performersError;
  }

  const performers =
    eventPerformers
      ?.map((ep) => ep.performer as unknown as Performer)
      .filter(Boolean) ?? [];

  return {
    ...event,
    venue: event.venue as Venue | null,
    performers,
  };
};

/**
 * Check if event has available spots
 */
export const checkEventAvailability = async (
  eventId: string,
  quantity: number
): Promise<{ available: boolean; spotsLeft: number }> => {
  const supabase = getSupabaseAdmin();

  const { data: event, error } = await supabase
    .from("events")
    .select("spots_left, status")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    return { available: false, spotsLeft: 0 };
  }

  return {
    available: event.status === "published" && event.spots_left >= quantity,
    spotsLeft: event.spots_left,
  };
};

// ============================================
// CUSTOMER QUERIES
// ============================================

/**
 * Find or create customer by email
 */
export const findOrCreateCustomer = async (
  customerData: CustomerInsert
): Promise<Customer> => {
  const supabase = getSupabaseAdmin();

  // Try to find existing customer
  const { data: existingCustomer, error: findError } = await supabase
    .from("customers")
    .select("*")
    .eq("email", customerData.email)
    .single();

  if (existingCustomer && !findError) {
    // Update name and phone if provided
    if (customerData.name || customerData.phone) {
      const { data: updatedCustomer, error: updateError } = await supabase
        .from("customers")
        .update({
          name: customerData.name,
          phone: customerData.phone,
        })
        .eq("id", existingCustomer.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating customer:", updateError);
        return existingCustomer;
      }

      return updatedCustomer;
    }

    return existingCustomer;
  }

  // Create new customer
  const { data: newCustomer, error: createError } = await supabase
    .from("customers")
    .insert(customerData)
    .select()
    .single();

  if (createError) {
    console.error("Error creating customer:", createError);
    throw createError;
  }

  return newCustomer;
};

// ============================================
// TRANSACTION QUERIES
// ============================================

/**
 * Create a new transaction
 */
export const createTransaction = async (
  transactionData: TransactionInsert
): Promise<Transaction> => {
  const supabase = getSupabaseAdmin();

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }

  return transaction;
};

/**
 * Update transaction by order_id
 */
export const updateTransactionByOrderId = async (
  orderId: string,
  updateData: TransactionUpdate
): Promise<Transaction | null> => {
  const supabase = getSupabaseAdmin();

  const { data: transaction, error } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("order_id", orderId)
    .select()
    .single();

  if (error) {
    console.error("Error updating transaction:", error);
    return null;
  }

  return transaction;
};

/**
 * Get transaction by order_id
 */
export const getTransactionByOrderId = async (
  orderId: string
): Promise<Transaction | null> => {
  const supabase = getSupabaseAdmin();

  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching transaction:", error);
    throw error;
  }

  return transaction;
};

/**
 * Get transaction with details
 */
export const getTransactionWithDetails = async (orderId: string) => {
  const supabase = getSupabaseAdmin();

  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      customer:customers(*),
      event:events(
        *,
        venue:venues(*)
      )
    `
    )
    .eq("order_id", orderId)
    .single();

  if (error) {
    console.error("Error fetching transaction with details:", error);
    return null;
  }

  return transaction;
};

// ============================================
// TICKET QUERIES
// ============================================

/**
 * Generate unique ticket code
 */
const generateTicketCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "SUN6-";

  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 4) {
      result += "-";
    }
  }

  return result;
};

/**
 * Create tickets for a transaction
 */
export const createTicketsForTransaction = async (
  transactionId: string,
  eventId: string,
  customerId: string,
  quantity: number
): Promise<Ticket[]> => {
  const supabase = getSupabaseAdmin();

  const ticketsToCreate: TicketInsert[] = [];

  for (let i = 0; i < quantity; i++) {
    ticketsToCreate.push({
      ticket_code: generateTicketCode(),
      transaction_id: transactionId,
      event_id: eventId,
      customer_id: customerId,
      status: "reserved",
      qr_code_data: null,
      checked_in_at: null,
    });
  }

  const { data: tickets, error } = await supabase
    .from("tickets")
    .insert(ticketsToCreate)
    .select();

  if (error) {
    console.error("Error creating tickets:", error);
    throw error;
  }

  return tickets;
};

/**
 * Activate tickets after payment settlement
 */
export const activateTickets = async (
  transactionId: string
): Promise<Ticket[]> => {
  const supabase = getSupabaseAdmin();

  const { data: tickets, error } = await supabase
    .from("tickets")
    .update({ status: "active" })
    .eq("transaction_id", transactionId)
    .eq("status", "reserved")
    .select();

  if (error) {
    console.error("Error activating tickets:", error);
    throw error;
  }

  return tickets;
};

/**
 * Cancel tickets for a transaction
 */
export const cancelTickets = async (
  transactionId: string
): Promise<Ticket[]> => {
  const supabase = getSupabaseAdmin();

  const { data: tickets, error } = await supabase
    .from("tickets")
    .update({ status: "cancelled" })
    .eq("transaction_id", transactionId)
    .in("status", ["reserved", "active"])
    .select();

  if (error) {
    console.error("Error cancelling tickets:", error);
    throw error;
  }

  return tickets;
};

/**
 * Get tickets by customer email
 */
export const getTicketsByCustomerEmail = async (
  email: string
): Promise<Ticket[]> => {
  const supabase = getSupabaseAdmin();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .single();

  if (customerError || !customer) {
    return [];
  }

  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select(
      `
      *,
      event:events(
        *,
        venue:venues(*)
      ),
      transaction:transactions(*)
    `
    )
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  if (ticketsError) {
    console.error("Error fetching tickets:", ticketsError);
    return [];
  }

  return tickets;
};

/**
 * Get ticket by code for check-in
 */
export const getTicketByCode = async (ticketCode: string) => {
  const supabase = getSupabaseAdmin();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      `
      *,
      customer:customers(*),
      event:events(
        *,
        venue:venues(*)
      ),
      transaction:transactions(*)
    `
    )
    .eq("ticket_code", ticketCode)
    .single();

  if (error) {
    console.error("Error fetching ticket:", error);
    return null;
  }

  return ticket;
};

/**
 * Check-in a ticket
 */
export const checkInTicket = async (
  ticketCode: string
): Promise<{ success: boolean; message: string; ticket?: Ticket }> => {
  const supabase = getSupabaseAdmin();

  // Get ticket
  const { data: ticket, error: fetchError } = await supabase
    .from("tickets")
    .select("*")
    .eq("ticket_code", ticketCode)
    .single();

  if (fetchError || !ticket) {
    return { success: false, message: "Tiket tidak ditemukan" };
  }

  if (ticket.status === "used") {
    return {
      success: false,
      message: `Tiket sudah digunakan pada ${ticket.checked_in_at}`,
    };
  }

  if (ticket.status !== "active") {
    return {
      success: false,
      message: `Tiket tidak valid. Status: ${ticket.status}`,
    };
  }

  // Update ticket
  const { data: updatedTicket, error: updateError } = await supabase
    .from("tickets")
    .update({
      status: "used",
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .select()
    .single();

  if (updateError) {
    return { success: false, message: "Gagal melakukan check-in" };
  }

  return {
    success: true,
    message: "Check-in berhasil!",
    ticket: updatedTicket,
  };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Decrease event spots
 */
export const decreaseEventSpots = async (
  eventId: string,
  quantity: number
): Promise<boolean> => {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc("decrease_spots", {
    p_event_id: eventId,
    p_quantity: quantity,
  });

  if (error) {
    console.error("Error decreasing spots:", error);
    return false;
  }

  return true;
};

/**
 * Increase event spots (for cancellations)
 */
export const increaseEventSpots = async (
  eventId: string,
  quantity: number
): Promise<boolean> => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("events")
    .update({
      spots_left: supabase.rpc("increment_spots", {
        row_id: eventId,
        amount: quantity,
      }),
    })
    .eq("id", eventId);

  if (error) {
    // Fallback: manual update
    const { data: event } = await supabase
      .from("events")
      .select("spots_left, capacity")
      .eq("id", eventId)
      .single();

    if (event) {
      const newSpots = Math.min(event.spots_left + quantity, event.capacity);
      await supabase
        .from("events")
        .update({ spots_left: newSpots })
        .eq("id", eventId);
    }
  }

  return true;
};

