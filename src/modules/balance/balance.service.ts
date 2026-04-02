import { getAiml, getTripo } from "../../services";

export async function getAimlBalance() {
  return getAiml().getBalance();
}

export async function getTripoBalance() {
  return getTripo().getBalance();
}

