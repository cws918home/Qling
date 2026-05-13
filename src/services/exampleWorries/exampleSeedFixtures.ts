import type { ExampleWorrySeed } from './types';

export const exampleWorrySeedFixtures: ExampleWorrySeed[] = [
  {
    id: 'career_first_job',
    content: '새 직장에서 제가 너무 느린 사람처럼 보일까 봐 걱정돼요.',
    categories: ['career'],
    status: 'active',
  },
  {
    id: 'career_interview',
    content: '면접을 앞두고 말이 꼬일까 봐 계속 긴장돼요.',
    categories: ['career'],
    status: 'active',
  },
  {
    id: 'family_distance',
    content: '가족과 대화하면 자꾸 감정이 앞서서 멀어지는 느낌이에요.',
    categories: ['family'],
    status: 'active',
  },
  {
    id: 'relationship_reply',
    content: '친구 답장이 늦으면 제가 뭘 잘못했나 계속 생각하게 돼요.',
    categories: ['relationship'],
    status: 'active',
  },
  {
    id: 'study_focus',
    content: '공부를 시작해도 금방 흐트러져서 하루가 끝나면 죄책감이 들어요.',
    categories: ['study'],
    status: 'active',
  },
  {
    id: 'health_sleep',
    content: '잠을 충분히 못 자서 작은 일에도 예민해지는 것 같아요.',
    categories: ['health'],
    status: 'active',
  },
  {
    id: 'inactive_old_seed',
    content: '비활성 예시는 선택되면 안 됩니다.',
    categories: ['career'],
    status: 'inactive',
  },
];
